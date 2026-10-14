import { requireAccountManagement } from "@/lib/api-auth";
import { createDodoPortal } from "@/lib/dodo";
import { apiError, fromUnknownError, json } from "@/lib/http";
import { getBilling } from "@/server/billing";

export async function POST(request: Request) {
  try {
    const auth = await requireAccountManagement(request);
    const billing = await getBilling(auth.workspaceId);
    if (!billing?.dodoCustomerId) return apiError("NO_BILLING_CUSTOMER", "No subscription is linked to this workspace. Email milan@cassettelabs.in if you need help.", 404);
    return json({ portal_url: await createDodoPortal(billing.dodoCustomerId) });
  } catch (error) { return fromUnknownError(error); }
}
