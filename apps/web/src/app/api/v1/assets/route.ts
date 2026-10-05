import { requireAuth } from "@/lib/api-auth";
import { apiError, fromUnknownError, json } from "@/lib/http";
import { createAsset } from "@/server/assets";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authContext = await requireAuth(request);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return apiError("NO_FILE", "Attach an image as the file field.");
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const asset = await createAsset(authContext, { mimeType: file.type, bytes });
    return json(asset, 201);
  } catch (error) {
    return fromUnknownError(error);
  }
}
