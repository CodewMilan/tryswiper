import { and, eq } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { requireAuth } from "@/lib/api-auth";
import { db, schema } from "@/lib/db";
import { E2E_COOKIE, e2eEnabled, isE2eUserId } from "@/lib/auth-env";
import { apiError, fromUnknownError, json, readJson } from "@/lib/http";
import { eraseAccountContent, finishAccountErasure } from "@/server/account-erasure";

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.source !== "session") return apiError("SESSION_REQUIRED", "Sign in to delete your account.", 403);
    if (request.headers.get("origin") !== new URL(request.url).origin) return apiError("INVALID_ORIGIN", "Delete your account from Swiper’s account settings.", 403);
    const body = await readJson(request) as { confirmation?: unknown };
    if (!body || body.confirmation !== "DELETE") return apiError("CONFIRMATION_REQUIRED", "Type DELETE to confirm permanent deletion.", 400);
    const fixture = e2eEnabled(request.headers.get("host")) && isE2eUserId(auth.userId);
    if (!fixture) {
      const [account] = await db.select({ clerkId: schema.account.accountId }).from(schema.account).where(and(eq(schema.account.providerId, "clerk"), eq(schema.account.userId, auth.userId))).limit(1);
      if (!account) return apiError("IDENTITY_UNAVAILABLE", "Account deletion is temporarily unavailable. Contact support.", 503);
      try { await (await clerkClient()).users.deleteUser(account.clerkId); }
      catch (error) {
        if (!(error && typeof error === "object" && "status" in error && error.status === 404)) return apiError("IDENTITY_UNAVAILABLE", "Account deletion could not be confirmed. Check your account before retrying, or contact support.", 503);
      }
    }
    await eraseAccountContent(auth.userId);
    let billingPending = false;
    try { await finishAccountErasure(auth.userId); }
    catch { billingPending = true; }
    const response = json({ deleted: true, billing_followup_pending: billingPending }, billingPending ? 202 : 200);
    if (fixture) response.cookies.set(E2E_COOKIE, "", { maxAge: 0, path: "/" });
    return response;
  } catch (error) { return fromUnknownError(error); }
}
