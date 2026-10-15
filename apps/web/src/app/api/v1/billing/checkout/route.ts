import { eq } from "drizzle-orm";
import { schema } from "@swiper/db";
import { requireAccountManagement } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { createDodoCheckout } from "@/lib/dodo";
import { apiError, fromUnknownError, json } from "@/lib/http";
import { appUrl } from "@/lib/utils";
import { getBilling } from "@/server/billing";
import { isPaidPlan } from "@/lib/plans";
import { readJson } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authContext = await requireAccountManagement(request);
    const body = await readJson(request);
    if (!body || typeof body !== "object" || !("plan" in body) || !isPaidPlan(body.plan)) return apiError("INVALID_PLAN", "Choose Pro or Studio.", 400);
    const plan = body.plan;
    const existing = await getBilling(authContext.workspaceId);
    if (existing?.dodoSubscriptionId && !["cancelled", "canceled", "expired", "failed"].includes(existing.status) || existing?.status === "verification_required" && existing.dodoCustomerId) {
      return apiError("SUBSCRIPTION_EXISTS", "This workspace has a subscription or its current status could not be confirmed. Use Manage subscription or email milan@cassettelabs.in before starting another checkout.", 409);
    }
    const [person] = await db
      .select({ email: schema.user.email, name: schema.user.name })
      .from(schema.user)
      .where(eq(schema.user.id, authContext.userId))
      .limit(1);
    if (!person?.email || person.email.endsWith("@users.swiper.invalid")) {
      return apiError("MISSING_EMAIL", "This account needs an email before checkout.", 400);
    }
    const checkoutUrl = await createDodoCheckout({
      email: person.email,
      name: person.name,
      workspaceId: authContext.workspaceId,
      plan,
      returnUrl: `${appUrl()}/pricing?status=success&plan=${plan}`,
    });
    return json({ checkout_url: checkoutUrl });
  } catch (error) {
    return fromUnknownError(error);
  }
}
