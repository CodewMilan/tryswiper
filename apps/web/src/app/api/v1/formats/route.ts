import { requireAuth } from "@/lib/api-auth";
import { fromUnknownError, json } from "@/lib/http";
import { createWorkspaceFormat, listAvailableFormats } from "@/server/workspace-formats";

export async function GET(request: Request) {
  try {
    const authContext = await requireAuth(request);
    return json(await listAvailableFormats(authContext));
  } catch (error) {
    return fromUnknownError(error);
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await requireAuth(request);
    const body = (await request.json()) as {
      carousel_id?: string;
      name?: string;
      description?: string;
    };
    if (!body.carousel_id?.trim() || !body.name?.trim()) {
      throw Object.assign(new Error("Carousel and format name are required."), {
        status: 400,
        code: "INVALID_REQUEST",
      });
    }
    return json(
      await createWorkspaceFormat({
        auth: authContext,
        carouselId: body.carousel_id.trim(),
        name: body.name,
        description: body.description,
      }),
      201,
    );
  } catch (error) {
    return fromUnknownError(error);
  }
}
