import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { apiError, fromUnknownError, json } from "@/lib/http";
import { disableClerkIdentity, refreshClerkIdentity } from "@/server/identity";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET) return apiError("WEBHOOK_NOT_CONFIGURED", "Account synchronization is not configured.", 503);
  let event;
  try { event = await verifyWebhook(request); }
  catch { return apiError("INVALID_SIGNATURE", "Webhook signature did not match.", 401); }
  try {
    if (event.type === "user.deleted" && event.data.id) await disableClerkIdentity(event.data.id);
    else if ((event.type === "user.updated" || event.type === "user.created") && event.data.id) {
      // Re-read provider state so delayed events cannot re-enable a removed account.
      await refreshClerkIdentity(event.data.id);
    }
    return json({ received: true });
  } catch (error) { return fromUnknownError(error); }
}
