import { requireAuth } from "@/lib/api-auth";
import { fromUnknownError, json } from "@/lib/http";
import { deleteAsset, getAsset } from "@/server/assets";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await requireAuth(request);
    const { id } = await context.params;
    const asset = await getAsset(authContext, id);
    return new Response(asset.bytes, {
      headers: {
        "Content-Type": asset.mimeType,
        "Content-Length": String(asset.bytes.byteLength),
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return fromUnknownError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const auth = await requireAuth(request); const { id } = await context.params; return json(await deleteAsset(auth, id)); }
  catch (error) { return fromUnknownError(error); }
}
