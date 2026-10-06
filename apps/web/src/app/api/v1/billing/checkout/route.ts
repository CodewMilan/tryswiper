import { eq } from "drizzle-orm";
import { schema } from "@swiper/db";
import { requireAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { createDodoCheckout } from "@/lib/dodo";
import { apiError, fromUnknownError, json } from "@/lib/http";
import { appUrl } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authContext = await requireAuth(request);
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
      returnUrl: `${appUrl()}/pricing?status=success`,
    });
    return json({ checkout_url: checkoutUrl });
  } catch (error) {
    return fromUnknownError(error);
  }
}
