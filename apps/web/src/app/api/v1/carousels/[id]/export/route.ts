import { requireAuth } from "@/lib/api-auth";
import { editorUrl } from "@/lib/utils";
import { fromUnknownError, json } from "@/lib/http";
import { getCarousel } from "@/server/carousels";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await requireAuth(request);
    const { id } = await context.params;
    await getCarousel(authContext, id);
    return json({
      carousel_id: id,
      editor_url: editorUrl(id),
      download_url: `${editorUrl(id)}?export=json`,
      formats: ["json"],
      note: "PNG/PDF export ships with the visual editor. JSON and the editor link are available now.",
    });
  } catch (error) {
    return fromUnknownError(error);
  }
}
