import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-auth";
import { db, schema } from "@/lib/db";
import { apiError, fromUnknownError, json } from "@/lib/http";
import { sid } from "@/lib/ids";
import { appUrl } from "@/lib/utils";
import { getCarousel, validateExisting } from "@/server/carousels";
import { recordUsage, requireFeature, withUsageTransaction } from "@/server/usage";

function result(id: string, carouselId: string, status: string) {
  const base = appUrl().replace(/\/$/, "");
  return {
    publish_job_id: id,
    carousel_id: carouselId,
    status,
    platform: "manual",
    downloads: {
      png: `${base}/api/v1/carousels/${carouselId}/export?format=png`,
      jpg: `${base}/api/v1/carousels/${carouselId}/export?format=jpg`,
      pdf: `${base}/api/v1/carousels/${carouselId}/export?format=pdf`,
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
    await requireFeature(authContext.workspaceId, "publish");
    const { id } = await context.params;
    await getCarousel(authContext, id);
    const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
    if (!idempotencyKey || idempotencyKey.length > 120) {
      return apiError("IDEMPOTENCY_KEY_REQUIRED", "Send an Idempotency-Key under 120 characters.", 400);
    }

    const [existing] = await db
      .select()
      .from(schema.publishJob)
      .where(and(eq(schema.publishJob.workspaceId, authContext.workspaceId), eq(schema.publishJob.idempotencyKey, idempotencyKey)))
      .limit(1);
    if (existing) return json(result(existing.id, existing.carouselId, existing.status));

    const validation = await validateExisting(authContext, id);
    if (!validation.ok) {
      return apiError("PUBLISH_VALIDATION_FAILED", "Fix the carousel errors before publishing.", 422, { errors: validation.errors });
    }

    const jobId = sid("pub");
    await withUsageTransaction(authContext.workspaceId, ["publish"], async (tx) => {
      await tx.insert(schema.publishJob).values({
        id: jobId,
        workspaceId: authContext.workspaceId,
        carouselId: id,
        platform: "manual",
        status: "ready",
        idempotencyKey,
      });
      await tx.update(schema.carousel).set({ status: "approved", updatedAt: new Date() }).where(eq(schema.carousel.id, id));
      await recordUsage(authContext.workspaceId, "publish", tx);
    });
    return json({ ...result(jobId, id, "ready"), validation }, 201);
  } catch (error) {
    return fromUnknownError(error);
  }
}
