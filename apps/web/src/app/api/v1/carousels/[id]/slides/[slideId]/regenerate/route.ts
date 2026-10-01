import { requireAuth } from "@/lib/api-auth";
import { apiError, fromUnknownError, json } from "@/lib/http";
import { generateSlide } from "@/server/carousels";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; slideId: string }> },
) {
  try {
    const authContext = await requireAuth(request);
    const { id, slideId } = await context.params;
    const body = (await request.json()) as { instruction?: string };
    if (!body.instruction?.trim()) {
      return apiError("INVALID_INSTRUCTION", "Say what to change on this slide.", 400);
    }
    return json(await generateSlide(authContext, id, slideId, body.instruction.trim()));
  } catch (error) {
    return fromUnknownError(error);
  }
}
