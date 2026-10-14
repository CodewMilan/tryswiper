import { requireAuth } from "@/lib/api-auth";
import { fromUnknownError, json } from "@/lib/http";
import { generateCarousel } from "@/server/carousels";
import { referenceContext } from "@/server/reference-post";
import { creationRequest } from "@/lib/creation-request";
import { generationSchema, readRequestBody } from "@/lib/request-schemas";

export async function POST(request: Request) {
  try {
    const authContext = await requireAuth(request);
    const body = await readRequestBody(request, generationSchema);
    const reference = body.reference_url?.trim() ? await referenceContext(body.reference_url.trim()) : null;
    const result = await generateCarousel({
      auth: authContext,
      brief: [body.brief.trim(), reference?.context].filter(Boolean).join("\n\n"),
      title: body.title,
      formatId: body.format_id,
      slideCount: body.slide_count,
      request: creationRequest(request, body),
    });
    const editorUrl = reference?.warning
      ? `${result.editor_url}${result.editor_url.includes("?") ? "&" : "?"}reference=unavailable`
      : result.editor_url;
    return json({
      ...result,
      editor_url: editorUrl,
      warnings: [...(result.warnings ?? []), ...(reference?.warning ? [reference.warning] : [])],
    }, 201);
  } catch (error) {
    return fromUnknownError(error);
  }
}
