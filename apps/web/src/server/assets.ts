import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { schema } from "@swiper/db";
import { imageDimensions } from "@/lib/image-dimensions";
import { assertAssetStorage, withResourceBudget } from "./resource-budget";
import { readImageSize } from "@swiper/rendering";
import type { AuthContext } from "../lib/api-auth";
import { db } from "../lib/db";
import { sid } from "../lib/ids";
import { ASSET_SIZE_ERROR, MAX_ASSET_BYTES } from "@/lib/upload-limits";

export { MAX_ASSET_BYTES };
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
    throw Object.assign(new Error(ASSET_SIZE_ERROR), {
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
  if (!unique.length) return out;
  const metadata = await db.select({ id: schema.asset.id, width: schema.asset.width, height: schema.asset.height, bytes: schema.asset.byteSize })
    .from(schema.asset).where(and(eq(schema.asset.workspaceId, workspaceId), inArray(schema.asset.id, unique)));
  if (metadata.length !== unique.length) throw Object.assign(new Error("A referenced image is unavailable. Replace it before exporting."), { status: 422, code: "MISSING_ASSET" });
  if (metadata.some((asset) => !asset.width || !asset.height || asset.width > 4096 || asset.height > 4096) || metadata.reduce((total, asset) => total + (asset.width ?? 0) * (asset.height ?? 0), 0) > 24000000 || metadata.reduce((total, asset) => total + asset.bytes, 0) > 32 * 1024 * 1024) {
    throw Object.assign(new Error("This export uses too many full-size images (24 megapixels or 32 MiB in total). Upload smaller images or export one slide at a time."), { status: 413, code: "RENDER_ASSET_BUDGET" });
  }
  const rows = await db.select({ id: schema.asset.id, data: schema.asset.data }).from(schema.asset).where(and(eq(schema.asset.workspaceId, workspaceId), inArray(schema.asset.id, unique)));
  for (const row of rows) out.set(row.id, Buffer.from(row.data, "base64"));
  return out;
}

export async function listAssets(auth: AuthContext, offset = 0) {
  if (!Number.isInteger(offset) || offset < 0 || offset > 200) throw Object.assign(new Error("Provide a valid image-library page."), { status: 400, code: "INVALID_PAGE" });
  const rows = await db.select({ id: schema.asset.id, mime_type: schema.asset.mimeType, width: schema.asset.width, height: schema.asset.height, byte_size: schema.asset.byteSize, created_at: schema.asset.createdAt })
    .from(schema.asset).where(eq(schema.asset.workspaceId, auth.workspaceId)).orderBy(desc(schema.asset.createdAt), desc(schema.asset.id)).limit(51).offset(offset);
  return { assets: rows.slice(0, 50), next_offset: rows.length > 50 ? offset + 50 : null };
}

/** Never remove assets referenced by a live draft, saved format, brand, or retained undo snapshot. */
export async function deleteAsset(auth: AuthContext, id: string) {
  return db.transaction(async (tx) => {
    await tx.select({ id: schema.workspace.id }).from(schema.workspace).where(eq(schema.workspace.id, auth.workspaceId)).for("no key update");
    const [asset] = await tx.select({ id: schema.asset.id }).from(schema.asset).where(and(eq(schema.asset.id, id), eq(schema.asset.workspaceId, auth.workspaceId)));
    if (!asset) throw Object.assign(new Error("Asset not found."), { status: 404, code: "NOT_FOUND" });
    const references = await tx.execute(sql`select 1 where
      exists(select 1 from brand where workspace_id=${auth.workspaceId} and logo_asset_id=${id}) or
      exists(select 1 from carousel c join project p on p.id=c.project_id where p.workspace_id=${auth.workspaceId} and jsonb_path_exists(c.content_json, '$.slides[*].elements[*] ? (@.assetId == $asset)', jsonb_build_object('asset', ${id}::text))) or
      exists(select 1 from carousel_version v join carousel c on c.id=v.carousel_id join project p on p.id=c.project_id where p.workspace_id=${auth.workspaceId} and jsonb_path_exists(v.content_json, '$.slides[*].elements[*] ? (@.assetId == $asset)', jsonb_build_object('asset', ${id}::text))) or
      exists(select 1 from workspace_format where workspace_id=${auth.workspaceId} and jsonb_path_exists(content_json, '$.slides[*].elements[*] ? (@.assetId == $asset)', jsonb_build_object('asset', ${id}::text)))`);
    if (references.length) throw Object.assign(new Error("This image is used by a brand, draft, saved format or undo history. Remove those references before deleting it."), { status: 409, code: "ASSET_IN_USE" });
    // Lock against concurrent references: all document writes must acquire this workspace lock too.
    await tx.delete(schema.asset).where(eq(schema.asset.id, id));
    return { asset_id: id, deleted: true };
  });
}
