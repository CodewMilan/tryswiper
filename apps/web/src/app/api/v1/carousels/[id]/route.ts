import { requireAuth } from "@/lib/api-auth";
import { editorUrl } from "@/lib/utils";
import { fromUnknownError, json } from "@/lib/http";
import { getCarousel, updateCarousel } from "@/server/carousels";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await requireAuth(request);
    const { id } = await context.params;
    const row = await getCarousel(authContext, id);
    return json({
      carousel_id: row.id,
      editor_url: editorUrl(row.id),
      status: row.status,
      version: row.version,
      title: row.title,
      format_id: row.formatId,
      carousel: row.contentJson,
      plan: row.planJson,
    });
  } catch (error) {
    return fromUnknownError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await requireAuth(request);
    const { id } = await context.params;
    const body = (await request.json()) as { operations?: unknown[] };
    return json(await updateCarousel(authContext, id, body.operations ?? []));
  } catch (error) {
    return fromUnknownError(error);
  }
}
