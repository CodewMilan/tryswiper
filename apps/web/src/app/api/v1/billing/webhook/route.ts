import { dodoConfig } from "@/lib/dodo";
import { verifyDodoWebhook, webhookEventType, webhookIds, workspaceIdFromWebhook } from "@/lib/dodo-webhook";
import { apiError, json } from "@/lib/http";
import { recordBilling } from "@/server/billing";

export const runtime = "nodejs";

const activeEvents = new Set(["payment.succeeded", "subscription.active", "subscription.renewed"]);
const inactiveEvents = new Set([
  "subscription.cancelled",
  "subscription.canceled",
  "subscription.expired",
  "subscription.on_hold",
  "subscription.failed",
]);

function planFor(type: string, status: string | null) {
  if (activeEvents.has(type)) return { plan: "pro" as const, status: "active" };
  if (inactiveEvents.has(type)) return { plan: "free" as const, status: "cancelled" };
  if (type === "subscription.updated") {
    if (status === "active") return { plan: "pro" as const, status: "active" };
    if (status && ["cancelled", "canceled", "expired", "on_hold", "failed"].includes(status)) {
      return { plan: "free" as const, status };
    }
  }
  return null;
}

export async function POST(request: Request) {
  const config = dodoConfig();
  if (!config.webhookSecret) {
    return apiError("PAYMENTS_NOT_CONFIGURED", "DODO_PAYMENTS_WEBHOOK_SECRET is not set.", 503);
  }

  const rawBody = await request.text();
  if (!verifyDodoWebhook(rawBody, request.headers, config.webhookSecret)) {
    return apiError("INVALID_SIGNATURE", "Webhook signature did not match.", 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return apiError("INVALID_JSON", "Webhook body must be JSON.", 400);
  }

  const type = webhookEventType(payload);
  const ids = webhookIds(payload);
  const next = planFor(type, ids.status);
  if (!next) return json({ received: true });

  const workspaceId = workspaceIdFromWebhook(payload);
  if (!workspaceId) return json({ received: true, ignored: true });

  const saved = await recordBilling({
    workspaceId,
    plan: next.plan,
    status: next.status,
    customerId: ids.customerId,
    subscriptionId: ids.subscriptionId,
    paymentId: ids.paymentId,
  });
  return json({ received: true, applied: saved });
}
