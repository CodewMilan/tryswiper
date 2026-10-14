import { requireAuth } from "@/lib/api-auth";
import { fromUnknownError, json, readJson } from "@/lib/http";
import { undoCarousel } from "@/server/carousels";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await requireAuth(request);
    const { id } = await context.params;
    const body = request.headers.get("content-type")?.includes("application/json")
      ? await readJson(request) as { expected_version?: number } : {};
    return json(await undoCarousel(authContext, id, body.expected_version));
  } catch (error) {
    return fromUnknownError(error);
  }
}
