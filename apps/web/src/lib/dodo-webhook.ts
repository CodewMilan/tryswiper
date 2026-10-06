import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_SKEW_SECONDS = 5 * 60;

function secretKeys(secret: string) {
  const stripped = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  const decoded = Buffer.from(stripped, "base64");
  const utf8 = Buffer.from(stripped, "utf8");
  const keys = decoded.equals(utf8) ? [decoded] : [decoded, utf8];
  return keys.filter((key) => key.length > 0);
}

function signaturesMatch(expected: string, presented: string) {
  const actual = Buffer.from(presented);
  const target = Buffer.from(expected);
  return actual.length === target.length && timingSafeEqual(actual, target);
}

export function verifyDodoWebhook(rawBody: string, headers: Headers, secret: string) {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatureHeader = headers.get("webhook-signature");
  if (!id || !timestamp || !signatureHeader || !secret) return false;

  const issuedAt = Number(timestamp);
  if (!Number.isFinite(issuedAt)) return false;
  if (Math.abs(Date.now() / 1000 - issuedAt) > MAX_SKEW_SECONDS) return false;

  const signed = `${id}.${timestamp}.${rawBody}`;
  const presented = signatureHeader
    .split(/\s+/)
    .map((part) => (part.includes(",") ? part.slice(part.indexOf(",") + 1) : part))
    .filter(Boolean);
  if (presented.length === 0) return false;

  return secretKeys(secret).some((key) => {
    const expected = createHmac("sha256", key).update(signed).digest("base64");
    return presented.some((value) => signaturesMatch(expected, value));
  });
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function workspaceIdFromWebhook(payload: unknown) {
  const root = asRecord(payload);
  if (!root) return null;
  const layers = [root, asRecord(root.data), asRecord(asRecord(root.data)?.payload)];
  for (const layer of layers) {
    const metadata = asRecord(layer?.metadata);
    const id = metadata?.workspace_id ?? metadata?.workspaceId;
    if (typeof id === "string" && id.startsWith("ws_")) return id;
  }
  return null;
}

export function webhookEventType(payload: unknown) {
  const root = asRecord(payload);
  const type = root?.type ?? root?.event_type;
  return typeof type === "string" ? type : "";
}

export function webhookIds(payload: unknown) {
  const data = asRecord(asRecord(payload)?.data) ?? asRecord(payload) ?? {};
  const customer = asRecord(data.customer);
  const text = (value: unknown) => (typeof value === "string" ? value : null);
  return {
    customerId: text(customer?.customer_id) ?? text(data.customer_id),
    subscriptionId: text(data.subscription_id),
    paymentId: text(data.payment_id),
    status: text(data.status),
  };
}
