import { requireAuth } from "@/lib/api-auth";
import { apiError, fromUnknownError, json } from "@/lib/http";
import { generateCarousel, startCarouselFromFormat } from "@/server/carousels";
import { referenceContext } from "@/server/reference-post";

export async function POST(request: Request) {
  try {
    const authContext = await requireAuth(request);
    const body = (await request.json()) as {
      title?: string;
      brief?: string;
      format_id?: string;
      reference_url?: string;
    };
    if (!body || (body.title !== undefined && (typeof body.title !== "string" || body.title.length > 120)) ||
      (body.brief !== undefined && (typeof body.brief !== "string" || body.brief.length > 10000)) ||
      (body.format_id !== undefined && typeof body.format_id !== "string") ||
      (body.reference_url !== undefined && (typeof body.reference_url !== "string" || body.reference_url.length > 2000))) {
      return apiError("INVALID_REQUEST", "Provide a title under 120 characters and a valid format or brief.", 400);
    }
    if (body.brief?.trim()) {
      const reference = body.reference_url?.trim() ? await referenceContext(body.reference_url.trim()) : null;
      const result = await generateCarousel({
        auth: authContext,
        brief: [body.brief.trim(), reference?.context].filter(Boolean).join("\n\n"),
        title: body.title,
        formatId: body.format_id,
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
