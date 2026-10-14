import { dodoConfig, retrieveDodoSubscription } from "@/lib/dodo";
import { verifyDodoWebhook, webhookEventType, webhookIds } from "@/lib/dodo-webhook";
import { apiError, fromUnknownError, json, readBody } from "@/lib/http";
import { applySubscriptionEvent } from "@/server/billing";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const subscriptionEvents = new Set(["subscription.active", "subscription.renewed", "subscription.updated", "subscription.cancelled", "subscription.canceled",
  "subscription.expired", "subscription.on_hold", "subscription.failed", "subscription.paused", "subscription.unpaused", "subscription.past_due"]);

export async function POST(request: Request) {
  const config = dodoConfig();
  if (!config.webhookSecret) {
    return apiError("PAYMENTS_NOT_CONFIGURED", "DODO_PAYMENTS_WEBHOOK_SECRET is not set.", 503);
  }

  let rawBody: string;
  try { rawBody = new TextDecoder().decode(await readBody(request)); } catch (error) { return fromUnknownError(error); }
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
  // Payment success also includes card verifications and unrelated purchases.
  if (!subscriptionEvents.has(type)) return json({ received: true, ignored: true });
  const timestamp = payload && typeof payload === "object" && "timestamp" in payload ? payload.timestamp : null;
  const occurredAt = typeof timestamp === "string" ? new Date(timestamp) : new Date(NaN);
  if (!ids.subscriptionId || !Number.isFinite(occurredAt.getTime()) || occurredAt.getTime() > Date.now() + 5 * 60_000) return apiError("INVALID_SUBSCRIPTION_EVENT", "Subscription event ID and occurrence time are required.");
  try {
    const [processed] = await db.select({ id: schema.billingWebhook.id }).from(schema.billingWebhook)
      .where(eq(schema.billingWebhook.id, request.headers.get("webhook-id")!)).limit(1);
    if (processed) return json({ received: true, applied: false, reason: "duplicate" });
    // Re-read authoritative state instead of granting access from a stale payload.
    const verificationStartedAt = new Date();
    const subscription = await retrieveDodoSubscription(ids.subscriptionId);
    const workspaceId = subscription.metadata.workspace_id ?? subscription.metadata.workspaceId;
    if (!workspaceId?.startsWith("ws_")) return json({ received: true, ignored: true });
    const result = await applySubscriptionEvent({ eventId: request.headers.get("webhook-id")!, type, occurredAt, workspaceId, subscription, verificationStartedAt });
    return json({ received: true, ...result });
  } catch (error) { return fromUnknownError(error); }
}
