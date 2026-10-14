import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-auth";
import {
  COLOR_KEYS,
  DEFAULT_BRAND_COLORS,
  DEFAULT_BRAND_FONTS,
  isFontChoice,
  normalizeHex,
  type BrandColors,
  type BrandFonts,
} from "@/lib/brand-visuals";
import { db, schema } from "@/lib/db";
import { apiError, fromUnknownError, json, readJson } from "@/lib/http";
import { getAsset } from "@/server/assets";
import { getWorkspaceBrand } from "@/lib/workspace";

function badRequest(message: string) {
  return apiError("INVALID_BRAND", message);
}

function readColors(input: unknown, current: BrandColors): BrandColors | Response {
  if (!input || typeof input !== "object") return current;
  const next = { ...current };
  for (const key of COLOR_KEYS) {
    if (!(key in input)) continue;
    const value = (input as Record<string, unknown>)[key];
    if (typeof value !== "string") return badRequest("Colors must be hex values like #171717.");
    const hex = normalizeHex(value);
    if (!hex) return badRequest(`${key} must be a hex color like #171717.`);
    next[key] = hex;
  }
  return next;
}

function readFonts(input: unknown, current: BrandFonts): BrandFonts | Response {
  if (!input || typeof input !== "object") return current;
  const next = { ...current };
  for (const key of ["heading", "body"] as const) {
    if (!(key in input)) continue;
    const value = (input as Record<string, unknown>)[key];
    if (typeof value !== "string" || !isFontChoice(value)) {
      return badRequest("Pick a heading and body font from the list.");
    }
    next[key] = value;
  }
  return next;
}

export async function GET(request: Request) {
  try {
    const authContext = await requireAuth(request);
    const brand = await getWorkspaceBrand(authContext.workspaceId);
    return json({ brand });
  } catch (error) {
    return fromUnknownError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const authContext = await requireAuth(request);
    const body = (await readJson(request)) as Record<string, unknown>;
    if (!body || typeof body !== "object" || Array.isArray(body)) return badRequest("Provide a brand object.");
    for (const field of ["description", "audience", "positioning", "tone", "cta", "website", "guidelines"]) {
      const limit = field === "cta" ? 120 : field === "website" ? 2000 : 10000;
      if (field in body && (typeof body[field] !== "string" || body[field].length > limit)) return badRequest(`${field} must be text under ${limit} characters.`);
    }
    for (const field of ["wordsToUse", "wordsToAvoid", "proofPoints"]) {
      if (field in body && (!Array.isArray(body[field]) || body[field].length > 100 || !body[field].every((item: unknown) => typeof item === "string" && item.trim().length > 0 && item.length <= 1000))) return badRequest(`${field} must be a list of nonempty short text entries.`);
    }
    if ("name" in body && (typeof body.name !== "string" || !body.name.trim() || body.name.length > 120)) return badRequest("Product name must be between 1 and 120 characters.");
    return await db.transaction(async (tx) => {
    await tx.select({ id: schema.workspace.id }).from(schema.workspace).where(eq(schema.workspace.id, authContext.workspaceId)).for("no key update");
    const current = await getWorkspaceBrand(authContext.workspaceId);
    if (!current) {
      return fromUnknownError(
        Object.assign(new Error("Brand kit missing"), { status: 400, code: "NO_BRAND" }),
      );
    }

    const colors = readColors(body.colors, {
      background: current.colors?.background ?? DEFAULT_BRAND_COLORS.background,
      primary: current.colors?.primary ?? DEFAULT_BRAND_COLORS.primary,
      secondary: current.colors?.secondary ?? DEFAULT_BRAND_COLORS.secondary,
      accent: current.colors?.accent ?? DEFAULT_BRAND_COLORS.accent,
    });
    if (colors instanceof Response) return colors;

    const fonts = readFonts(body.fonts, {
      heading: current.fonts?.heading ?? DEFAULT_BRAND_FONTS.heading,
      body: current.fonts?.body ?? DEFAULT_BRAND_FONTS.body,
    });
    if (fonts instanceof Response) return fonts;

    let logoAssetId = current.logoAssetId ?? null;
    if ("logoAssetId" in body) {
      if (body.logoAssetId === null || body.logoAssetId === "") {
        logoAssetId = null;
      } else if (typeof body.logoAssetId === "string") {
        const asset = await getAsset(authContext, body.logoAssetId);
        logoAssetId = asset.id;
      } else {
        return badRequest("Logo must be an uploaded image.");
      }
    }

    const [updated] = await tx
      .update(schema.brand)
      .set({
        name: typeof body.name === "string" ? body.name : current.name,
        description:
          typeof body.description === "string" ? body.description : current.description,
        audience: typeof body.audience === "string" ? body.audience : current.audience,
        positioning:
          typeof body.positioning === "string" ? body.positioning : current.positioning,
        tone: typeof body.tone === "string" ? body.tone : current.tone,
        wordsToUse: Array.isArray(body.wordsToUse)
          ? (body.wordsToUse as string[])
          : current.wordsToUse,
        wordsToAvoid: Array.isArray(body.wordsToAvoid)
          ? (body.wordsToAvoid as string[])
          : current.wordsToAvoid,
        cta: typeof body.cta === "string" ? body.cta : current.cta,
        website: typeof body.website === "string" ? body.website : current.website,
        proofPoints: Array.isArray(body.proofPoints)
          ? (body.proofPoints as string[])
          : current.proofPoints,
        colors,
        fonts,
        logoAssetId,
        guidelines: typeof body.guidelines === "string" ? body.guidelines : current.guidelines,
        updatedAt: new Date(),
      })
      .where(eq(schema.brand.id, current.id))
      .returning();

    return json({ brand: updated });
    });
  } catch (error) {
    return fromUnknownError(error);
  }
}
