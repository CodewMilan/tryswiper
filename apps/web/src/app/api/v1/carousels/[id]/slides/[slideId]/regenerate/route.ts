import { requireAuth } from "@/lib/api-auth";
import { fromUnknownError, json } from "@/lib/http";
import { generateSlide } from "@/server/carousels";
import { readRequestBody, slideRevisionSchema } from "@/lib/request-schemas";
import { creationRequest } from "@/lib/creation-request";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; slideId: string }> },
) {
  try {
    const authContext = await requireAuth(request);
    const { id, slideId } = await context.params;
    const body = await readRequestBody(request, slideRevisionSchema);
    return json(await generateSlide(authContext, id, slideId, body.instruction, creationRequest(request, { operation: "revise_slide", carousel_id: id, slide_id: slideId, ...body })));
  } catch (error) {
    return fromUnknownError(error);
  }
}
