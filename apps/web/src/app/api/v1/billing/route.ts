import { requireAuth } from "@/lib/api-auth";
import { fromUnknownError, json } from "@/lib/http";
import { getBilling } from "@/server/billing";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const authContext = await requireAuth(request);
    const row = await getBilling(authContext.workspaceId);
    return json({
      plan: row?.plan === "pro" ? "pro" : "free",
      status: row?.status ?? "inactive",
    });
  } catch (error) {
    return fromUnknownError(error);
  }
}
