import { requireAuth } from "@/lib/api-auth";
import { apiError, fromUnknownError, json } from "@/lib/http";
import { generateCarousel } from "@/server/carousels";
import { referenceContext } from "@/server/reference-post";

export async function POST(request: Request) {
  try {
    const authContext = await requireAuth(request);
    const body = (await request.json()) as {
      brief?: string;
      title?: string;
      format_id?: string;
      slide_count?: number;
      reference_url?: string;
    };
    if (!body.brief?.trim()) {
      return apiError("INVALID_BRIEF", "A brief is required.", 400);
    }
    if (body.reference_url !== undefined && (typeof body.reference_url !== "string" || body.reference_url.length > 2000)) {
      return apiError("INVALID_REFERENCE_URL", "Reference post must be a valid public URL.", 400);
    }
    const reference = body.reference_url?.trim() ? await referenceContext(body.reference_url.trim()) : null;
    const result = await generateCarousel({
      auth: authContext,
      brief: [body.brief.trim(), reference].filter(Boolean).join("\n\n"),
      title: body.title,
      formatId: body.format_id,
      slideCount: body.slide_count,
    });
    return json(result, 201);
  } catch (error) {
    return fromUnknownError(error);
  }
}
