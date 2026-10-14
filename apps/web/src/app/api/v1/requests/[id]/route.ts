import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-auth";
import { db, schema } from "@/lib/db";
import { apiError, fromUnknownError, json } from "@/lib/http";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    if (!/^[A-Za-z0-9._:-]{1,120}$/.test(id)) return apiError("INVALID_REQUEST_ID", "Provide a valid request ID.", 400);
    const [receipt] = await db.select().from(schema.creationRequest)
      .where(and(eq(schema.creationRequest.workspaceId, auth.workspaceId), eq(schema.creationRequest.requestKey, id))).limit(1);
    const expired = receipt && (Date.now() - receipt.createdAt.getTime() > 30 * 86400000 || (receipt.resultJson as { expired?: boolean }).expired);
    return json(receipt ? { request_id: id, status: !receipt.carouselId ? "deleted" : expired ? "expired" : "completed", carousel_id: receipt.carouselId, result: receipt.carouselId && !expired ? receipt.resultJson : undefined }
      : { request_id: id, status: "not_completed", next_step: "No committed result yet. A request may still be running; retry with the same ID and unchanged inputs to recover one result." });
  } catch (error) { return fromUnknownError(error); }
}
