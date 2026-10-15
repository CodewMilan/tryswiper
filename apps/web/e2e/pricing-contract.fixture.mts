import assert from "node:assert/strict";
import { createDodoCheckout, dodoConfig } from "../src/lib/dodo";
import { PLANS, paidPlanForProduct, PLAN_LIMITS } from "../src/lib/plans";

const previous = { fetch: globalThis.fetch, env: { ...process.env } };
try {
  process.env.DODO_PAYMENTS_API_KEY = "fixture_key_only";
  process.env.DODO_PAYMENTS_PRODUCT_ID = "fixture_pro";
  delete process.env.DODO_PAYMENTS_PRO_PRODUCT_ID;
  process.env.DODO_PAYMENTS_STUDIO_PRODUCT_ID = "fixture_studio";
  process.env.DODO_PAYMENTS_WEBHOOK_SECRET = "fixture_secret";
  process.env.DODO_PAYMENTS_ENVIRONMENT = "test_mode";
  assert.equal(dodoConfig({ NODE_ENV: "test" }).ready, false);
  assert.equal(dodoConfig(process.env, "studio").ready, true);
  assert.equal(paidPlanForProduct("unknown", dodoConfig().products), null);
  assert.equal(paidPlanForProduct("same", { pro: "same", studio: "same" }), null);
  assert.equal(dodoConfig({ ...process.env, DODO_PAYMENTS_STUDIO_PRODUCT_ID: "fixture_pro" }, "studio").ready, false);
  assert.ok(PLAN_LIMITS.studio.generation > PLAN_LIMITS.pro.generation);
  let checkouts = 0;
  for (const plan of ["pro", "studio"] as const) {
    const productId = dodoConfig(process.env, plan).productId;
    const price = { type: "recurring_price", currency: "USD", price: PLANS[plan].monthlyPriceCents, payment_frequency_count: 1, payment_frequency_interval: "Month" };
    let override: Record<string, unknown> = {};
    globalThis.fetch = async (url, init) => {
      const path = new URL(String(url)).pathname;
      if (path === `/products/${productId}`) return Response.json({ product_id: productId, price: { ...price, ...override } });
      assert.equal(path, "/checkouts"); assert.equal(init?.method, "POST"); checkouts++;
      const body = JSON.parse(String(init?.body));
      assert.deepEqual(body.product_cart, [{ product_id: productId, quantity: 1 }]);
      assert.equal(body.metadata.plan, plan);
      assert.equal(body.metadata.workspace_id, "ws_fixture");
      return Response.json({ checkout_url: "https://checkout.example.test/session" });
    };
    const input = { email: "fixture@example.test", name: "Fixture", workspaceId: "ws_fixture", plan };
    assert.equal(await createDodoCheckout(input), "https://checkout.example.test/session");
    const before = checkouts;
    for (override of [{ price: 100 }, { currency: "INR" }, { payment_frequency_interval: "Year" }, { payment_frequency_count: 12 }, { type: "one_time_price" }, { discount_bps: 500 }, { purchasing_power_parity: true }, { tax_inclusive: true }, { trial_period_days: 7 }]) {
      await assert.rejects(createDodoCheckout(input), (error: unknown) => (error as { code: string }).code === "PRICE_CONFIGURATION_MISMATCH");
    }
    assert.equal(checkouts, before); // No checkout was opened for any mismatched offer.
  }
  assert.equal(checkouts, 2);
  console.log("Pro/Studio checkout selection and price/currency/cadence guards passed.");
} finally {
  globalThis.fetch = previous.fetch;
  for (const name of Object.keys(process.env)) if (!(name in previous.env)) delete process.env[name];
  Object.assign(process.env, previous.env);
}
