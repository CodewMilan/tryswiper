import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-auth";
import { db, schema } from "@/lib/db";
import { apiError, fromUnknownError, json, readJson } from "@/lib/http";
import { sid } from "@/lib/ids";
import { appUrl } from "@/lib/utils";
import { getCarousel, validateExisting } from "@/server/carousels";
import { recordUsage, requireFeature, withUsageTransaction } from "@/server/usage";

function result(id: string, carouselId: string, status: string, version: number) {
  const base = appUrl().replace(/\/$/, "");
  return {
    publish_job_id: id,
    carousel_id: carouselId,
    status,
    version,
    platform: "manual",
    downloads: {
      png: `${base}/api/v1/carousels/${carouselId}/export?format=png&version=${version}`,
      jpg: `${base}/api/v1/carousels/${carouselId}/export?format=jpg&version=${version}`,
      pdf: `${base}/api/v1/carousels/${carouselId}/export?format=pdf&version=${version}`,
    },
    next_step: "Download the platform-ready images and publish them from your social account.",
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await requireAuth(request);
    const { id } = await context.params;
    const current = await getCarousel(authContext, id);
    const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
    if (!idempotencyKey || !/^[A-Za-z0-9._:-]{1,120}$/.test(idempotencyKey)) {
      return apiError("IDEMPOTENCY_KEY_REQUIRED", "Send an Idempotency-Key of up to 120 letters, digits, dots, colons, underscores or hyphens.", 400);
    }
    const body = request.headers.get("content-type")?.includes("application/json") ? await readJson(request) as { expected_version?: number } : {};
    if (!body || typeof body !== "object" || (body.expected_version !== undefined && (!Number.isInteger(body.expected_version) || body.expected_version < 1))) return apiError("INVALID_VERSION", "Provide a positive expected_version.", 400);
    if (body.expected_version !== undefined && body.expected_version !== current.version) return apiError("VERSION_CONFLICT", "Save and review the latest draft before preparing files.", 409);
    const replay = async (reader: Pick<typeof db, "select">) => {
      const [existing] = await reader.select().from(schema.publishJob)
        .where(and(eq(schema.publishJob.workspaceId, authContext.workspaceId), eq(schema.publishJob.idempotencyKey, idempotencyKey))).limit(1);
      if (!existing) return null;
      if (existing.carouselId !== id || existing.documentVersion !== current.version) throw Object.assign(new Error("This preparation key belongs to another draft or version. Review the latest draft and use a new key."), { status: 409, code: "PREPARATION_CHANGED" });
      return result(existing.id, id, existing.status, current.version);
    };
    const existing = await replay(db);
    if (existing) return json(existing);
    await requireFeature(authContext.workspaceId, "publish");
    const validation = await validateExisting(authContext, id);
    if (validation.version !== current.version) return apiError("VERSION_CONFLICT", "The draft changed during checks. Review it again.", 409);
    if (!validation.ok) return apiError("PUBLISH_VALIDATION_FAILED", "Fix the carousel errors before preparing files.", 422, { errors: validation.errors });
    const prepared = await withUsageTransaction(authContext.workspaceId, ["publish"], async (tx) => {
      const [approved] = await tx.update(schema.carousel).set({ status: "approved", updatedAt: new Date() })
        .where(and(eq(schema.carousel.id, id), eq(schema.carousel.version, current.version))).returning({ id: schema.carousel.id });
      if (!approved) throw Object.assign(new Error("The draft changed during preparation. Review it again."), { status: 409, code: "VERSION_CONFLICT" });
      const jobId = sid("pub");
      await tx.insert(schema.publishJob).values({ id: jobId, workspaceId: authContext.workspaceId, carouselId: id,
        platform: "manual", status: "ready", idempotencyKey, documentVersion: current.version });
      await recordUsage(authContext.workspaceId, "publish", tx);
      return { ...result(jobId, id, "ready", current.version), validation };
    }, async (tx) => {
      const previous = await replay(tx);
      if (!previous) return null;
      const [latest] = await tx.select({ version: schema.carousel.version }).from(schema.carousel).where(eq(schema.carousel.id, id)).for("share");
      if (latest?.version !== current.version) throw Object.assign(new Error("The prepared draft has changed. Review the current version."), { status: 409, code: "VERSION_CONFLICT" });
      return { value: previous };
    });
    return json(prepared, 201);
  } catch (error) {
    return fromUnknownError(error);
  }
}
