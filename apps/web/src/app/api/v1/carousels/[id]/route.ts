import { requireAuth } from "@/lib/api-auth";
import { editorUrl } from "@/lib/utils";
import { fromUnknownError, json, readJson } from "@/lib/http";
import { deleteCarousel, getCarousel, getHistoricalCarousel, undoDepth, updateCarousel } from "@/server/carousels";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await requireAuth(request);
    const { id } = await context.params;
    const historicalVersion = new URL(request.url).searchParams.get("version");
    const row = historicalVersion === null ? await getCarousel(authContext, id)
      : await getHistoricalCarousel(authContext, id, Number(historicalVersion));
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
    const body = (await readJson(request)) as { operations?: unknown[]; expected_version?: number; mutation_id?: string };
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
    const expected = new URL(request.url).searchParams.get("expected_version");
    return json(await deleteCarousel(authContext, id, expected === null ? undefined : Number(expected)));
  } catch (error) {
    return fromUnknownError(error);
  }
}
