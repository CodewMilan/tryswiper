import { appUrl } from "@/lib/utils";
import { subscriptionSchema } from "@/lib/subscription";
import { PLANS, paidPlanForProduct, type PaidPlan, type ProductPlans } from "@/lib/plans";

export type DodoConfig = {
  apiKey: string;
  productId: string;
  webhookSecret: string;
  environment: "test_mode" | "live_mode";
  base: string;
  ready: boolean;
  products: ProductPlans;
};

export function dodoConfig(env: NodeJS.ProcessEnv = process.env, plan: PaidPlan = "pro"): DodoConfig {
  const apiKey = env.DODO_PAYMENTS_API_KEY?.trim() ?? "";
  const products = { pro: env.DODO_PAYMENTS_PRO_PRODUCT_ID?.trim() || env.DODO_PAYMENTS_PRODUCT_ID?.trim() || "", studio: env.DODO_PAYMENTS_STUDIO_PRODUCT_ID?.trim() || "" };
  const productId = products[plan];
  const webhookSecret = env.DODO_PAYMENTS_WEBHOOK_SECRET?.trim() ?? "";
  const environment = env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode";
  return {
    apiKey,
    productId,
    products,
    webhookSecret,
    environment,
    base: environment === "live_mode" ? "https://live.dodopayments.com" : "https://test.dodopayments.com",
    ready: Boolean(apiKey && productId && webhookSecret && paidPlanForProduct(productId, products) === plan),
  };
}

export async function createDodoCheckout(input: {
  email: string;
  name: string;
  workspaceId: string;
  returnUrl?: string;
  plan?: PaidPlan;
}) {
  const plan = input.plan ?? "pro";
  const config = dodoConfig(process.env, plan);
  if (!config.ready) {
    console.error("billing_checkout_not_configured", {
      hasApiKey: Boolean(config.apiKey),
      hasProductId: Boolean(config.productId),
      hasWebhookSecret: Boolean(config.webhookSecret),
      environment: config.environment,
    });
    throw Object.assign(
      new Error("Checkout is temporarily unavailable. Please try again later."),
      { status: 503, code: "PAYMENTS_NOT_CONFIGURED" },
    );
  }

  // Refuse a checkout that would charge a different price/currency/cadence
  // from the public catalogue. Product metadata never decides entitlements.
  const productResponse = await fetch(`${config.base}/products/${encodeURIComponent(config.productId)}`, {
    headers: { Authorization: `Bearer ${config.apiKey}` }, signal: AbortSignal.timeout(10000), cache: "no-store",
  });
  const product = await productResponse.json().catch(() => ({})) as { product_id?: string; price?: { type?: string; currency?: string; price?: number; payment_frequency_count?: number; payment_frequency_interval?: string; discount?: number; discount_bps?: number; purchasing_power_parity?: boolean; tax_inclusive?: boolean; trial_period_days?: number } };
  const price = product.price;
  if (!productResponse.ok || product.product_id !== config.productId || price?.type !== "recurring_price" || price.currency !== "USD" || price.price !== PLANS[plan].monthlyPriceCents || price.payment_frequency_count !== 1 || price.payment_frequency_interval !== "Month" || price.discount || price.discount_bps || price.purchasing_power_parity || price.tax_inclusive || price.trial_period_days) {
    throw Object.assign(new Error("This plan’s checkout is temporarily unavailable. Email milan@cassettelabs.in for help."), { status: 503, code: "PRICE_CONFIGURATION_MISMATCH" });
  }

  const response = await fetch(`${config.base}/checkouts`, {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_cart: [{ product_id: config.productId, quantity: 1 }],
      customer: {
        email: input.email,
        ...(input.name ? { name: input.name } : {}),
      },
      return_url: input.returnUrl ?? `${appUrl()}/pricing?status=success`,
      metadata: { workspace_id: input.workspaceId, plan },
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    checkout_url?: string;
    payment_link?: string;
    url?: string;
    message?: string;
  };
  if (!response.ok) {
    console.error("billing_checkout_provider_error", { status: response.status });
    const message = "Checkout could not start. Please try again later.";
    throw Object.assign(new Error(message), { status: 502, code: "CHECKOUT_FAILED" });
  }

  const checkoutUrl = body.checkout_url ?? body.payment_link ?? body.url;
  if (!checkoutUrl) {
    console.error("billing_checkout_missing_url");
    throw Object.assign(new Error("Checkout could not start. Please try again later."), {
      status: 502,
      code: "CHECKOUT_FAILED",
    });
  }
  return checkoutUrl;
}

export async function createDodoPortal(customerId: string) {
  const config = dodoConfig();
  if (!config.apiKey || !config.webhookSecret) throw Object.assign(new Error("Subscription management is temporarily unavailable. Email milan@cassettelabs.in for help."), { status: 503, code: "PAYMENTS_NOT_CONFIGURED" });
  const query = new URLSearchParams({ return_url: `${appUrl()}/pricing`, send_email: "false" });
  const response = await fetch(`${config.base}/customers/${encodeURIComponent(customerId)}/customer-portal/session?${query}`, {
    method: "POST", headers: { Authorization: `Bearer ${config.apiKey}` }, signal: AbortSignal.timeout(15000), cache: "no-store",
  });
  const body = await response.json().catch(() => ({})) as { link?: string };
  if (!response.ok || !body.link || !body.link.startsWith("https://")) throw Object.assign(new Error("Could not open subscription management. Email milan@cassettelabs.in for help."), { status: 502, code: "PORTAL_FAILED" });
  return body.link;
}

export async function retrieveDodoSubscription(id: string) {
  const config = dodoConfig();
  if (!config.apiKey || !Object.values(config.products).some(Boolean)) throw Object.assign(new Error("Subscription verification is temporarily unavailable."), { status: 503, code: "PAYMENTS_NOT_CONFIGURED" });
  const response = await fetch(`${config.base}/subscriptions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${config.apiKey}` }, signal: AbortSignal.timeout(10000), cache: "no-store",
  });
  if (!response.ok) throw Object.assign(new Error("Could not verify the subscription. Please try again."), { status: 502, code: "SUBSCRIPTION_VERIFICATION_FAILED" });
  const parsed = subscriptionSchema.safeParse(await response.json());
  if (!parsed.success || parsed.data.subscription_id !== id) throw Object.assign(new Error("The payment provider returned an invalid subscription."), { status: 502, code: "INVALID_SUBSCRIPTION" });
  return parsed.data;
}

/** Account deletion ends the saved subscription immediately, without promising a refund. */
export async function cancelDodoSubscription(id: string) {
  const config = dodoConfig();
  if (!config.apiKey) throw Object.assign(new Error("Subscription cancellation is awaiting payment-provider configuration."), { status: 503, code: "CANCELLATION_PENDING" });
  const url = `${config.base}/subscriptions/${encodeURIComponent(id)}`;
  const options = { headers: { Authorization: `Bearer ${config.apiKey}` }, signal: AbortSignal.timeout(10000), cache: "no-store" as const };
  const existing = await fetch(url, options);
  const current = await existing.json().catch(() => ({})) as { subscription_id?: string; status?: string };
  if (!existing.ok || current.subscription_id !== id) throw Object.assign(new Error("Subscription cancellation could not be verified."), { status: 503, code: "CANCELLATION_PENDING" });
  if (["cancelled", "expired", "failed"].includes(current.status ?? "")) return;
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(10000), method: "PATCH", headers: { ...options.headers, "Content-Type": "application/json" }, body: JSON.stringify({ status: "cancelled" }) });
  const result = await response.json().catch(() => ({})) as { subscription_id?: string; status?: string };
  if (!response.ok || result.subscription_id !== id || result.status !== "cancelled") throw Object.assign(new Error("Subscription cancellation is pending. Contact support."), { status: 503, code: "CANCELLATION_PENDING" });
}
