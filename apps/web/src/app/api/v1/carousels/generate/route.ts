import { requireAuth } from "@/lib/api-auth";
import { apiError, fromUnknownError, json } from "@/lib/http";
import { generateCarousel } from "@/server/carousels";

export async function POST(request: Request) {
  try {
    const authContext = await requireAuth(request);
    const body = (await request.json()) as {
      brief?: string;
      title?: string;
      format_id?: string;
      slide_count?: number;
    };
    if (!body.brief?.trim()) {
      return apiError("INVALID_BRIEF", "A brief is required.", 400);
    }
    const result = await generateCarousel({
      auth: authContext,
      brief: body.brief.trim(),
      title: body.title,
      formatId: body.format_id,
      slideCount: body.slide_count,
    });
    return json(result, 201);
  } catch (error) {
    return fromUnknownError(error);
  }
}
