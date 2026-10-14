import { requireAuth } from "@/lib/api-auth";
import { apiError, fromUnknownError, json, readJson } from "@/lib/http";
import { getCarousel } from "@/server/carousels";
import { recordProductEvent } from "@/server/product-events";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request); const { id } = await context.params;
    await getCarousel(auth, id);
    const body = await readJson(request) as { rating?: string };
    if (!body || !["useful", "needs_work"].includes(body.rating ?? "")) return apiError("INVALID_FEEDBACK", "Choose useful or needs_work.", 400);
    await recordProductEvent(auth.workspaceId, "feedback", id, { source: auth.source, value: body.rating });
    return json({ recorded: true });
  } catch (error) { return fromUnknownError(error); }
}
