import { requireAuth } from "@/lib/api-auth";
import { fromUnknownError, json } from "@/lib/http";
import { validateExisting } from "@/server/carousels";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await requireAuth(request);
    const { id } = await context.params;
    return json(await validateExisting(authContext, id));
  } catch (error) {
    return fromUnknownError(error);
  }
}
