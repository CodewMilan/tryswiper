import { requireAccountManagement } from "@/lib/api-auth";
import { fromUnknownError, json } from "@/lib/http";
import { productMetrics } from "@/server/product-events";

export async function GET(request: Request) {
  try { const auth = await requireAccountManagement(request); return json(await productMetrics(auth.workspaceId)); }
  catch (error) { return fromUnknownError(error); }
}
