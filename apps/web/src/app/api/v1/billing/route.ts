import { requireAuth } from "@/lib/api-auth";
import { fromUnknownError, json } from "@/lib/http";
import { getBilling } from "@/server/billing";
import { PLAN_LIMITS, usageFor, workspacePlan } from "@/server/usage";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const authContext = await requireAuth(request);
    const [row, plan, usage] = await Promise.all([
      getBilling(authContext.workspaceId),
      workspacePlan(authContext.workspaceId),
      usageFor(authContext.workspaceId),
    ]);
    return json({
      plan,
      status: row?.status ?? "inactive",
      usage,
      limits: PLAN_LIMITS[plan],
    });
  } catch (error) {
    return fromUnknownError(error);
  }
}
