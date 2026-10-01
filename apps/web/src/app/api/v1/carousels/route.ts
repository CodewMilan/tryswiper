import { requireAuth } from "@/lib/api-auth";
import { apiError, fromUnknownError, json } from "@/lib/http";
import { generateCarousel } from "@/server/carousels";

export async function POST(request: Request) {
  try {
    const authContext = await requireAuth(request);
    const body = (await request.json()) as {
      title?: string;
      brief?: string;
      format_id?: string;
    };
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
    return apiError(
      "INVALID_BRIEF",
      "Pass a brief to create a carousel, or call swiper.generate_carousel.",
      400,
    );
  } catch (error) {
    return fromUnknownError(error);
  }
}
