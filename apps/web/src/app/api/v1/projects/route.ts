import { requireAuth } from "@/lib/api-auth";
import { fromUnknownError, json } from "@/lib/http";
import { listProjects } from "@/server/carousels";

export async function GET(request: Request) {
  try {
    const authContext = await requireAuth(request);
    const query = new URL(request.url).searchParams;
    return json(await listProjects(authContext, { offset: Number(query.get("offset") ?? 0), limit: Number(query.get("limit") ?? 25), query: query.get("q") ?? "", sort: query.get("sort") ?? "recent" }));
  } catch (error) {
    return fromUnknownError(error);
  }
}
