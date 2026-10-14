import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { db } from "../src/lib/db";
import { getBilling } from "../src/server/billing";
import { workspacePlan } from "../src/server/usage";
import { POST } from "../src/app/api/v1/billing/webhook/route";

const workspaceId = process.argv[2]!;
const secret = "test-billing-signature-only";
process.env.DODO_PAYMENTS_API_KEY = "test-provider-only";
process.env.DODO_PAYMENTS_PRODUCT_ID = "prod_swiper";
process.env.DODO_PAYMENTS_WEBHOOK_SECRET = `whsec_${Buffer.from(secret).toString("base64")}`;
process.env.DODO_PAYMENTS_ENVIRONMENT = "test_mode";
let subscription = {
  subscription_id: "sub_test", product_id: "prod_swiper", status: "active",
  customer: { customer_id: "customer_test" }, metadata: { workspace_id: workspaceId },
  created_at: new Date(Date.now() - 86400_000).toISOString(), next_billing_date: new Date(Date.now() + 86400_000).toISOString(),
  expires_at: new Date(Date.now() + 365 * 86400_000).toISOString(), cancel_at_next_billing_date: false,
};
const originalFetch = globalThis.fetch;
let calls = 0;
globalThis.fetch = async () => { calls++; return Response.json(subscription); };
const epoch = Date.now() - 60_000;
async function event(type: string, sequence: number, id = crypto.randomUUID()) {
  const raw = JSON.stringify({ type, timestamp: new Date(epoch + sequence * 1000).toISOString(), data: { subscription_id: subscription.subscription_id, total_amount: 0, metadata: { workspace_id: workspaceId } } });
  const sent = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", Buffer.from(secret)).update(`${id}.${sent}.${raw}`).digest("base64");
  const response = await POST(new Request("http://localhost/api/v1/billing/webhook", { method: "POST", headers: { "webhook-id": id, "webhook-timestamp": sent, "webhook-signature": `v1,${sig}` }, body: raw }));
  assert.equal(response.status, 200, await response.clone().text());
  return response.json();
}
try {
  await event("payment.succeeded", 0);
  assert.equal(await workspacePlan(workspaceId), "free");
  assert.equal(calls, 0);
  subscription = { ...subscription, product_id: "unrelated_product" };
  assert.equal((await event("subscription.active", 1)).reason, "unrelated_product");
  assert.equal(await workspacePlan(workspaceId), "free");
  subscription = { ...subscription, product_id: "prod_swiper" };
  const activationId = crypto.randomUUID();
  assert.equal((await event("subscription.active", 2, activationId)).applied, true);
  assert.equal(await workspacePlan(workspaceId), "pro");
  const beforeReplayCalls = calls;
  assert.equal((await event("subscription.active", 2, activationId)).reason, "duplicate");
  assert.equal(calls, beforeReplayCalls);
  subscription = { ...subscription, status: "cancelled" };
  await event("subscription.cancelled", 3);
  assert.equal(await workspacePlan(workspaceId), "free");
  subscription = { ...subscription, status: "active" };
  assert.equal((await event("subscription.active", 2)).reason, "stale");
  assert.equal(await workspacePlan(workspaceId), "free");
  subscription = { ...subscription, status: "active", cancel_at_next_billing_date: true };
  await event("subscription.updated", 4);
  assert.equal(await workspacePlan(workspaceId), "pro");
  assert.equal((await getBilling(workspaceId))!.cancelAtNextBilling, true);
  for (const [index, status] of ["paused", "on_hold", "expired", "failed", "pending"].entries()) {
    subscription = { ...subscription, status };
    await event("subscription.updated", 5 + index);
    assert.equal(await workspacePlan(workspaceId), "free");
    assert.equal((await getBilling(workspaceId))!.status, status);
  }
  subscription = { ...subscription, status: "past_due", next_billing_date: new Date(Date.now() - 1000).toISOString() };
  await event("subscription.past_due", 10);
  assert.equal(await workspacePlan(workspaceId), "pro");
  subscription = { ...subscription, status: "active", next_billing_date: new Date(Date.now() + 86400_000).toISOString() };
  await event("subscription.renewed", 11);
  assert.equal(await workspacePlan(workspaceId), "pro");
  subscription = { ...subscription, status: "active", next_billing_date: new Date(Date.now() - 1000).toISOString() };
  await event("subscription.updated", 12);
  assert.equal(await workspacePlan(workspaceId), "free");
  subscription = { ...subscription, subscription_id: "sub_new", created_at: new Date().toISOString(), next_billing_date: new Date(Date.now() + 86400_000).toISOString() };
  await event("subscription.active", 13);
  assert.equal(await workspacePlan(workspaceId), "pro");
  const replacement = subscription;
  subscription = { ...subscription, subscription_id: "sub_test", created_at: new Date(Date.now() - 86400_000).toISOString(), status: "cancelled" };
  assert.equal((await event("subscription.cancelled", 14)).reason, "superseded_subscription");
  assert.equal((await getBilling(workspaceId))!.dodoSubscriptionId, replacement.subscription_id);
  assert.equal(await workspacePlan(workspaceId), "pro");
} finally { globalThis.fetch = originalFetch; await db.$client.end(); }
