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
