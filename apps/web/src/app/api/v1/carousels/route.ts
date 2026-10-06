import { requireAuth } from "@/lib/api-auth";
import { apiError, fromUnknownError, json } from "@/lib/http";
import { generateCarousel, startCarouselFromFormat } from "@/server/carousels";

export async function POST(request: Request) {
  try {
    const authContext = await requireAuth(request);
    const body = (await request.json()) as {
      title?: string;
      brief?: string;
      format_id?: string;
    };
    if (!body || (body.title !== undefined && (typeof body.title !== "string" || body.title.length > 120)) ||
      (body.brief !== undefined && (typeof body.brief !== "string" || body.brief.length > 10000)) ||
      (body.format_id !== undefined && typeof body.format_id !== "string")) {
      return apiError("INVALID_REQUEST", "Provide a title under 120 characters and a valid format or brief.", 400);
    }
    if (body.brief?.trim()) {
      return json(
        await generateCarousel({
          auth: authContext,
          brief: body.brief.trim(),
          title: body.title,
          formatId: body.format_id,
        }),
        201,
      );
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
