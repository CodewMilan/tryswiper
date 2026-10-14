import { and, eq } from "drizzle-orm";
import { schema } from "@swiper/db";
import { imageDimensions } from "@/lib/image-dimensions";
import { assertAssetStorage, withResourceBudget } from "./resource-budget";
import { readImageSize } from "@swiper/rendering";
import type { AuthContext } from "../lib/api-auth";
import { db } from "../lib/db";
import { sid } from "../lib/ids";

export const MAX_ASSET_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function assetUrl(id: string) {
  return `/api/v1/assets/${id}`;
}

export async function createAsset(
  authContext: AuthContext,
  file: { mimeType: string; bytes: Uint8Array },
) {
  if (!ALLOWED_TYPES.includes(file.mimeType)) {
    throw Object.assign(new Error("Upload a PNG, JPEG, or WebP image."), {
      status: 400,
      code: "UNSUPPORTED_TYPE",
    });
  }
  if (file.bytes.byteLength > MAX_ASSET_BYTES) {
    throw Object.assign(new Error("Images must be 8MB or smaller."), {
      status: 413,
      code: "FILE_TOO_LARGE",
    });
  }

  const header = imageDimensions(file.bytes);
  if (!header || header.mimeType !== file.mimeType || !header.width || !header.height) throw Object.assign(new Error("That file has an unsupported image header or MIME type."), { status: 400, code: "UNREADABLE_IMAGE" });
  if (header.width > 4096 || header.height > 4096 || header.width * header.height > 12000000) throw Object.assign(new Error("Images must be at most 4096 pixels per side and 12 megapixels."), { status: 413, code: "IMAGE_DIMENSIONS_LIMIT" });
  return withResourceBudget(authContext.workspaceId, "render", async () => {
  const size = await readImageSize(file.bytes);
  if (!size) {
    throw Object.assign(new Error("That file is not a readable image."), {
      status: 400,
      code: "UNREADABLE_IMAGE",
    });
  }

  const id = sid("ast");
  await db.transaction(async (tx) => {
  await assertAssetStorage(authContext.workspaceId, file.bytes.byteLength, tx);
  await tx.insert(schema.asset).values({
    id,
    workspaceId: authContext.workspaceId,
    mimeType: file.mimeType,
    width: size.width,
    height: size.height,
    byteSize: file.bytes.byteLength,
    data: Buffer.from(file.bytes).toString("base64"),
    createdBy: authContext.userId, createdAt: new Date(),
  });
  });

  return {
    id,
    url: assetUrl(id),
    width: size.width,
    height: size.height,
    mime_type: file.mimeType,
  };
  });
}

export async function getAsset(authContext: AuthContext, id: string) {
  const rows = await db
    .select()
    .from(schema.asset)
    .where(and(eq(schema.asset.id, id), eq(schema.asset.workspaceId, authContext.workspaceId)))
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw Object.assign(new Error("Asset not found"), { status: 404, code: "NOT_FOUND" });
  }
  return { ...row, bytes: Buffer.from(row.data, "base64") };
}

/** Image bytes for every asset a carousel references, keyed by asset id. */
export async function assetsForWorkspace(workspaceId: string, assetIds: string[]) {
  const unique = [...new Set(assetIds)];
  const out = new Map<string, Uint8Array>();
  for (const assetId of unique) {
    const rows = await db
      .select({ data: schema.asset.data })
      .from(schema.asset)
      .where(and(eq(schema.asset.id, assetId), eq(schema.asset.workspaceId, workspaceId)))
      .limit(1);
    const row = rows[0];
    if (!row) throw Object.assign(new Error("A referenced image is unavailable. Replace it before exporting."), { status: 422, code: "MISSING_ASSET" });
    out.set(assetId, Buffer.from(row.data, "base64"));
  }
  return out;
}
