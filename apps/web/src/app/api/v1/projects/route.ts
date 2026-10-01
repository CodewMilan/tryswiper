import { requireAuth } from "@/lib/api-auth";
import { fromUnknownError, json } from "@/lib/http";
import { listProjects } from "@/server/carousels";

export async function GET(request: Request) {
  try {
    const authContext = await requireAuth(request);
    return json(await listProjects(authContext));
  } catch (error) {
    return fromUnknownError(error);
  }
}
