import { appUrl } from "@/lib/utils";

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
    ready: Boolean(apiKey && productId),
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
      environment: config.environment,
    });
    throw Object.assign(
      new Error("Checkout is temporarily unavailable. Please try again later."),
      { status: 503, code: "PAYMENTS_NOT_CONFIGURED" },
    );
  }

  const response = await fetch(`${config.base}/checkouts`, {
    method: "POST",
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
    console.error("billing_checkout_provider_error", { status: response.status, message: body.message });
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
