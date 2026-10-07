import { requireAuth } from "@/lib/api-auth";
import { editorUrl } from "@/lib/utils";
import { fromUnknownError, json } from "@/lib/http";
import { deleteCarousel, getCarousel, undoDepth, updateCarousel } from "@/server/carousels";

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
      last_mutation_id: row.lastMutationId,
      undo_count: await undoDepth(row.id),
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
    const body = (await request.json()) as { operations?: unknown[]; expected_version?: number; mutation_id?: string };
    return json(await updateCarousel(authContext, id, body.operations ?? [], body.expected_version, body.mutation_id));
  } catch (error) {
    return fromUnknownError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await requireAuth(request);
    const { id } = await context.params;
    return json(await deleteCarousel(authContext, id));
  } catch (error) {
    return fromUnknownError(error);
  }
}
