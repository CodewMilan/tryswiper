// Leave room for multipart headers under Vercel's 4.5 MB request limit.
export const MAX_ASSET_MIB = process.env.NEXT_PUBLIC_MAX_ASSET_MIB === "4" ? 4 : 8;
export const MAX_ASSET_BYTES = MAX_ASSET_MIB * 1024 * 1024;
export const ASSET_SIZE_ERROR = `Images must be ${MAX_ASSET_MIB}MB or smaller.`;
