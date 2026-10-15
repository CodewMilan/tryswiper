import { requireAuth } from "@/lib/api-auth";
import { apiError, fromUnknownError, json, readBody } from "@/lib/http";
import { createAsset, listAssets, MAX_ASSET_BYTES } from "@/server/assets";
import { ASSET_SIZE_ERROR } from "@/lib/upload-limits";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try { const auth = await requireAuth(request); return json(await listAssets(auth, Number(new URL(request.url).searchParams.get("offset") ?? 0))); }
  catch (error) { return fromUnknownError(error); }
}

export async function POST(request: Request) {
  try {
    const authContext = await requireAuth(request);
    const bytesWithForm = await readBody(request, MAX_ASSET_BYTES + 128 * 1024);
    const form = await new Request(request.url, { method: "POST", headers: request.headers, body: Buffer.from(bytesWithForm) }).formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return apiError("NO_FILE", "Attach an image as the file field.");
    }
    if (file.size > MAX_ASSET_BYTES) return apiError("FILE_TOO_LARGE", ASSET_SIZE_ERROR, 413);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const asset = await createAsset(authContext, { mimeType: file.type, bytes });
    return json(asset, 201);
  } catch (error) {
    return fromUnknownError(error);
  }
}
