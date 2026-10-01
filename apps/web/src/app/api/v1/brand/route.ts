import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-auth";
import { db, schema } from "@/lib/db";
import { fromUnknownError, json } from "@/lib/http";
import { getWorkspaceBrand } from "@/lib/workspace";

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
    const body = (await request.json()) as Record<string, unknown>;
    const current = await getWorkspaceBrand(authContext.workspaceId);
    if (!current) {
      return fromUnknownError(
        Object.assign(new Error("Brand kit missing"), { status: 400, code: "NO_BRAND" }),
      );
    }

    const [updated] = await db
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
        colors:
          body.colors && typeof body.colors === "object"
            ? { ...current.colors, ...(body.colors as object) }
            : current.colors,
        guidelines: typeof body.guidelines === "string" ? body.guidelines : current.guidelines,
        updatedAt: new Date(),
      })
      .where(eq(schema.brand.id, current.id))
      .returning();

    return json({ brand: updated });
  } catch (error) {
    return fromUnknownError(error);
  }
}
