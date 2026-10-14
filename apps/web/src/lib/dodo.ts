import { appUrl } from "@/lib/utils";
import { subscriptionSchema } from "@/lib/subscription";

export type DodoConfig = {
  apiKey: string;
  productId: string;
  webhookSecret: string;
  environment: "test_mode" | "live_mode";
  base: string;
  ready: boolean;
};

export function dodoConfig(env: NodeJS.ProcessEnv = process.env): DodoConfig {
  const apiKey = env.DODO_PAYMENTS_API_KEY?.trim() ?? "";
  const productId = env.DODO_PAYMENTS_PRODUCT_ID?.trim() ?? "";
  const webhookSecret = env.DODO_PAYMENTS_WEBHOOK_SECRET?.trim() ?? "";
  const environment = env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode";
  return {
    apiKey,
    productId,
    webhookSecret,
    environment,
    base: environment === "live_mode" ? "https://live.dodopayments.com" : "https://test.dodopayments.com",
    ready: Boolean(apiKey && productId && webhookSecret),
  };
}

export function proPriceLabel(env: NodeJS.ProcessEnv = process.env) {
  const raw = env.PRO_PRICE?.trim() || env.NEXT_PUBLIC_PRO_PRICE?.trim();
  if (!raw) return null;
  if (raw.startsWith("$")) return raw;
  if (/^\d+(\.\d+)?$/.test(raw)) return `$${raw}`;
  return raw;
}

export async function createDodoCheckout(input: {
  email: string;
  name: string;
  workspaceId: string;
  returnUrl?: string;
}) {
  const config = dodoConfig();
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
      metadata: { workspace_id: input.workspaceId },
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
  if (!config.ready) throw Object.assign(new Error("Subscription management is temporarily unavailable. Email milan@cassettelabs.in for help."), { status: 503, code: "PAYMENTS_NOT_CONFIGURED" });
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
  if (!config.apiKey || !config.productId) throw Object.assign(new Error("Subscription verification is temporarily unavailable."), { status: 503, code: "PAYMENTS_NOT_CONFIGURED" });
  const response = await fetch(`${config.base}/subscriptions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${config.apiKey}` }, signal: AbortSignal.timeout(10000), cache: "no-store",
  });
  if (!response.ok) throw Object.assign(new Error("Could not verify the subscription. Please try again."), { status: 502, code: "SUBSCRIPTION_VERIFICATION_FAILED" });
  const parsed = subscriptionSchema.safeParse(await response.json());
  if (!parsed.success || parsed.data.subscription_id !== id) throw Object.assign(new Error("The payment provider returned an invalid subscription."), { status: 502, code: "INVALID_SUBSCRIPTION" });
  return parsed.data;
}
