import { requireAuth } from "@/lib/api-auth";
import { editorUrl } from "@/lib/utils";
import { fromUnknownError, json } from "@/lib/http";
import { getCarousel } from "@/server/carousels";
import { carouselSchema } from "@swiper/schema";
import { renderExport } from "@swiper/rendering";
import { assetsForWorkspace } from "@/server/assets";
import { apiError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    const row = await getCarousel(auth, id);
    const parsed = carouselSchema.safeParse(row.contentJson);
    if (!parsed.success) return apiError("INVALID_CAROUSEL", "This draft contains unsupported visuals.", 422);
    const url = new URL(request.url);
    const slide = Number(url.searchParams.get("slide") ?? 1);
    if (!Number.isInteger(slide) || slide < 1 || slide > parsed.data.slides.length) return apiError("INVALID_SLIDE", "Choose a slide in this draft.", 400);
    const ids = parsed.data.slides[slide - 1]!.elements.flatMap((element) => element.assetId ? [element.assetId] : []);
    const file = await renderExport(parsed.data, "png", slide - 1, await assetsForWorkspace(auth.workspaceId, ids));
    return new Response(Buffer.from(file.bytes), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store", "X-Carousel-Version": String(row.version) } });
  } catch (error) { return fromUnknownError(error); }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await requireAuth(request);
    const { id } = await context.params;
    const row = await getCarousel(authContext, id);
    return json({
      carousel_id: id,
      editor_url: editorUrl(id),
      preview_url: editorUrl(id),
      status: row.status,
    });
  } catch (error) {
    return fromUnknownError(error);
  }
}
