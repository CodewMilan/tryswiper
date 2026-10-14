import { requireAuth } from "@/lib/api-auth";
import { apiError, fromUnknownError, json } from "@/lib/http";
import { generateCarousel, startCarouselFromFormat } from "@/server/carousels";
import { referenceContext } from "@/server/reference-post";
import { creationRequest } from "@/lib/creation-request";
import { creationSchema, readRequestBody } from "@/lib/request-schemas";

export async function POST(request: Request) {
  try {
    const authContext = await requireAuth(request);
    const body = await readRequestBody(request, creationSchema);
    if (body.brief?.trim()) {
      const reference = body.reference_url?.trim() ? await referenceContext(body.reference_url.trim()) : null;
      const result = await generateCarousel({
        auth: authContext,
        brief: [body.brief.trim(), reference?.context].filter(Boolean).join("\n\n"),
        title: body.title,
        formatId: body.format_id,
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
    }
    if (body.format_id?.trim()) {
      return json(
        await startCarouselFromFormat({
          auth: authContext,
          formatId: body.format_id.trim(),
          title: body.title,
          request: creationRequest(request, body),
        }),
        201,
      );
    }
    return apiError(
      "INVALID_REQUEST",
      "Pick a format, or pass a brief for the agent.",
      400,
    );
  } catch (error) {
    return fromUnknownError(error);
  }
}
