import { and, desc, eq } from "drizzle-orm";
import { schema } from "@swiper/db";
import {
  carouselSchema,
  listFormats,
  type Carousel,
  type CarouselPlan,
} from "@swiper/schema";
import type { AuthContext } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sid } from "@/lib/ids";
import { assertDocumentStorage } from "./resource-budget";

function formatSummary(row: typeof schema.workspaceFormat.$inferSelect) {
  const parsed = carouselSchema.safeParse(row.contentJson);
  if (!parsed.success) {
    console.error("workspace_format_invalid", { formatId: row.id, workspaceId: row.workspaceId });
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "A format saved from this workspace.",
    slideCount: { min: parsed.data.slides.length, max: parsed.data.slides.length },
    roles: parsed.data.slides.map((slide) => slide.role),
    source: "workspace" as const,
    preview: { slide: parsed.data.slides[0], theme: parsed.data.theme },
  };
}

export async function listAvailableFormats(auth: AuthContext) {
  const rows = await db
    .select()
    .from(schema.workspaceFormat)
    .where(eq(schema.workspaceFormat.workspaceId, auth.workspaceId))
    .orderBy(desc(schema.workspaceFormat.updatedAt)).limit(100);

  return {
    formats: [
      ...rows.map(formatSummary).filter((format) => format !== null),
      ...listFormats().map((format) => ({ ...format, source: "official" as const })),
    ],
  };
}

export async function getWorkspaceFormat(auth: AuthContext, id: string) {
  const rows = await db
    .select()
    .from(schema.workspaceFormat)
    .where(
      and(
        eq(schema.workspaceFormat.id, id),
        eq(schema.workspaceFormat.workspaceId, auth.workspaceId),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const content = carouselSchema.safeParse(row.contentJson);
  if (!content.success) {
    throw Object.assign(new Error("This workspace format is no longer valid."), {
      status: 422,
      code: "INVALID_FORMAT",
    });
  }
  return {
    ...row,
    contentJson: content.data,
    planJson: row.planJson as CarouselPlan | null,
  };
}

export async function createWorkspaceFormat(input: {
  auth: AuthContext;
  carouselId: string;
  name: string;
  description?: string;
}) {
  const name = input.name.trim();
  const description = input.description?.trim() || null;
  if (name.length < 2 || name.length > 80) {
    throw Object.assign(new Error("Format name must be between 2 and 80 characters."), {
      status: 400,
      code: "INVALID_NAME",
    });
  }
  if (description && description.length > 240) {
    throw Object.assign(new Error("Description must be 240 characters or fewer."), {
      status: 400,
      code: "INVALID_DESCRIPTION",
    });
  }

  return db.transaction(async (tx) => {
  await tx.select({ id: schema.workspace.id }).from(schema.workspace).where(eq(schema.workspace.id, input.auth.workspaceId)).for("no key update");
  const existingFormats = await tx.select({ id: schema.workspaceFormat.id }).from(schema.workspaceFormat).where(eq(schema.workspaceFormat.workspaceId, input.auth.workspaceId)).limit(100);
  if (existingFormats.length >= 100) throw Object.assign(new Error("This workspace reached its limit of 100 saved formats."), { status: 413, code: "FORMAT_STORAGE_LIMIT" });
  const sources = await tx
    .select({ carousel: schema.carousel, workspaceId: schema.project.workspaceId })
    .from(schema.carousel)
    .innerJoin(schema.project, eq(schema.project.id, schema.carousel.projectId))
    .where(eq(schema.carousel.id, input.carouselId))
    .limit(1);
  const source = sources[0];
  if (!source || source.workspaceId !== input.auth.workspaceId) {
    throw Object.assign(new Error("Carousel not found"), { status: 404, code: "NOT_FOUND" });
  }

  const content = carouselSchema.safeParse(source.carousel.contentJson);
  if (!content.success) {
    throw Object.assign(new Error("Fix the carousel before saving it as a format."), {
      status: 422,
      code: "INVALID_CAROUSEL",
    });
  }

  const duplicate = await tx
    .select({ id: schema.workspaceFormat.id })
    .from(schema.workspaceFormat)
    .where(
      and(
        eq(schema.workspaceFormat.workspaceId, input.auth.workspaceId),
        eq(schema.workspaceFormat.name, name),
      ),
    )
    .limit(1);
  if (duplicate[0]) {
    throw Object.assign(new Error("A workspace format with this name already exists."), {
      status: 409,
      code: "FORMAT_NAME_TAKEN",
    });
  }

  const id = sid("fmt");
  const [created] = await tx
    .insert(schema.workspaceFormat)
    .values({
      id,
      workspaceId: input.auth.workspaceId,
      name,
      description,
      sourceCarouselId: source.carousel.id,
      contentJson: content.data as Carousel,
      planJson: source.carousel.planJson,
      createdBy: input.auth.userId,
    })
    .onConflictDoNothing()
    .returning();

  if (!created) throw Object.assign(new Error("A workspace format with this name already exists."), { status: 409, code: "FORMAT_NAME_TAKEN" });
  await assertDocumentStorage(input.auth.workspaceId, tx);

  console.info("workspace_format_created", {
    formatId: id,
    workspaceId: input.auth.workspaceId,
    sourceCarouselId: source.carousel.id,
  });
  return { format: formatSummary(created!) };
  });
}
