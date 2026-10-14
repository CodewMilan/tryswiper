import { and, count, desc, eq } from "drizzle-orm";
import {
  type BrandContext,
  generatePlan,
  generationModelConfigured,
  reviseSlidePlan,
} from "@swiper/ai";
import {
  applyOperations,
  applySlideRevision,
  carouselFontFamily,
  DEFAULT_THEME,
  getFormat,
  instantiateCarouselTemplate,
  instantiateTemplatePlan,
  parseOperations,
  planFromFormat,
  planFromCarousel,
  repairPlan,
  renderPlanToCarousel,
  validateAndRepair,
  validateCarousel,
  type Carousel,
  type CarouselOperation,
  type CarouselPlan,
  type Theme,
} from "@swiper/schema";
import { schema } from "@swiper/db";
import type { AuthContext } from "../lib/api-auth";
import { db } from "../lib/db";
import { sid } from "../lib/ids";
import { editorUrl } from "../lib/utils";
import { getWorkspaceBrand } from "../lib/workspace";
import { getWorkspaceFormat } from "./workspace-formats";
import { getAsset } from "./assets";
import {
  isThinBrand,
  localGenerationWarning,
  thinBrandWarning,
  type GenerationWarning,
} from "@/lib/generation-notices";
import { assertUsage, recordUsage, withUsageTransaction } from "./usage";

function themeFromBrand(brand: NonNullable<Awaited<ReturnType<typeof getWorkspaceBrand>>>): Theme {
  return {
    background: brand.colors.background ?? DEFAULT_THEME.background,
    primary: brand.colors.primary ?? DEFAULT_THEME.primary,
    secondary: brand.colors.secondary ?? DEFAULT_THEME.secondary,
    accent: brand.colors.accent ?? DEFAULT_THEME.accent,
    fontFamily: carouselFontFamily(brand.fonts.heading),
    bodyFontFamily: carouselFontFamily(brand.fonts.body),
  };
}

function toBrandContext(
  brand: NonNullable<Awaited<ReturnType<typeof getWorkspaceBrand>>>,
): BrandContext {
  return {
    name: brand.name,
    description: brand.description,
    audience: brand.audience,
    positioning: brand.positioning,
    tone: brand.tone,
    wordsToUse: brand.wordsToUse,
    wordsToAvoid: brand.wordsToAvoid,
    cta: brand.cta,
    proofPoints: brand.proofPoints,
    website: brand.website,
    colors: brand.colors,
    fonts: brand.fonts,
    hasLogo: Boolean(brand.logoAssetId),
    guidelines: brand.guidelines,
  };
}

function addBrandLogo(content: Carousel, assetId: string | null) {
  if (!assetId) return;
  for (const slide of content.slides) {
    slide.elements.push({
      id: sid("el"), type: "logo", assetId, src: `/api/v1/assets/${assetId}`,
      x: 850, y: 68, width: 150, height: 64,
    });
  }
}

async function namedProject(authContext: AuthContext, name: string, description: string, writer: Pick<typeof db, "select" | "insert"> = db) {
  const existing = await writer
    .select()
    .from(schema.project)
    .where(
      and(eq(schema.project.workspaceId, authContext.workspaceId), eq(schema.project.name, name)),
    )
    .limit(1);
  if (existing[0]) return existing[0];

  const [brand] = await writer.select().from(schema.brand).where(eq(schema.brand.workspaceId, authContext.workspaceId)).limit(1);
  const [created] = await writer
    .insert(schema.project)
    .values({
      id: sid("prj"),
      workspaceId: authContext.workspaceId,
      brandId: brand?.id,
      name,
      description,
      createdBy: authContext.userId,
    })
    .returning();
  return created!;
}

async function persistNewCarousel(auth: AuthContext, content: Carousel, plan: CarouselPlan | null, method: "agent" | "manual", modelUsed = false) {
  return withUsageTransaction(auth.workspaceId, modelUsed ? ["carousel", "generation"] : ["carousel"], async (tx) => {
    const project = await namedProject(auth, method === "agent" ? "Agent carousels" : "Drafts", method === "agent" ? "Carousels created through MCP" : "Carousels started in the browser", tx);
    const id = sid("car");
    await tx.insert(schema.carousel).values({ id, projectId: project.id, title: content.metadata.title, formatId: content.metadata.formatId,
      status: "draft", contentJson: content, planJson: plan, createdBy: auth.userId });
    await recordUsage(auth.workspaceId, "carousel", tx);
    if (modelUsed) await recordUsage(auth.workspaceId, "generation", tx);
    return id;
  });
}

export async function generateCarousel(input: {
  auth: AuthContext;
  brief: string;
  title?: string;
  formatId?: string;
  slideCount?: number;
}) {
  await assertUsage(input.auth.workspaceId, "carousel");
  if (generationModelConfigured()) await assertUsage(input.auth.workspaceId, "generation");
  const brandRow = await getWorkspaceBrand(input.auth.workspaceId);
  if (!brandRow) {
    throw Object.assign(new Error("Brand kit missing"), { status: 400, code: "NO_BRAND" });
  }
  const brand = toBrandContext(brandRow);
  const theme = themeFromBrand(brandRow);
  const thinBrand = isThinBrand(brandRow);
  const { plan, source } = await generatePlan({
    brief: input.brief,
    formatId: input.formatId,
    brand,
  });
  if (input.title) plan.title = input.title;
  const result = validateAndRepair(plan, theme, {
    forbiddenWords: brand.wordsToAvoid,
    allowedProof: brand.proofPoints,
  });
  addBrandLogo(result.carousel, brandRow.logoAssetId);
  result.carousel.metadata = {
    ...result.carousel.metadata,
    generationSource: source,
    ...(thinBrand ? { thinBrand: true } : {}),
  };
  const id = await persistNewCarousel(input.auth, result.carousel, result.plan, "agent", source === "model");
  const warnings: GenerationWarning[] = [
    ...(source === "local" ? [localGenerationWarning()] : []),
    ...(thinBrand ? [thinBrandWarning()] : []),
  ];
  const query = new URLSearchParams();
  if (source === "local") query.set("generation", "local");
  if (thinBrand) query.set("brand", "thin");
  const suffix = query.toString();
  return {
    carousel_id: id,
    editor_url: suffix ? `${editorUrl(id)}?${suffix}` : editorUrl(id),
    status: "draft" as const,
    format_id: result.plan.formatId,
    source,
    warnings,
    validation: result.validation,
    carousel: result.carousel,
  };
}

export async function startCarouselFromFormat(input: {
  auth: AuthContext;
  formatId: string;
  title?: string;
}) {
  await assertUsage(input.auth.workspaceId, "carousel");
  const format = getFormat(input.formatId);
  const brandRow = await getWorkspaceBrand(input.auth.workspaceId);
  if (!brandRow) {
    throw Object.assign(new Error("Brand kit missing"), { status: 400, code: "NO_BRAND" });
  }

  if (!format) {
    const workspaceFormat = await getWorkspaceFormat(input.auth, input.formatId);
    if (!workspaceFormat) {
      throw Object.assign(new Error("That format is not in your library."), {
        status: 400,
        code: "UNKNOWN_FORMAT",
      });
    }
    const title = input.title?.trim() || workspaceFormat.name;
    const content = instantiateCarouselTemplate(workspaceFormat.contentJson, {
      formatId: workspaceFormat.id,
      title,
      newId: (kind) => sid(kind === "slide" ? "sld" : "el"),
    });
    const plan = instantiateTemplatePlan(workspaceFormat.planJson, {
      formatId: workspaceFormat.id,
      title,
    });
    const id = await persistNewCarousel(input.auth, content, plan, "manual");
    console.info("carousel_started_from_workspace_format", {
      carouselId: id,
      formatId: workspaceFormat.id,
      workspaceId: input.auth.workspaceId,
    });
    return {
      carousel_id: id,
      editor_url: editorUrl(id),
      status: "draft" as const,
      format_id: workspaceFormat.id,
      validation: validateCarousel(content, {
        forbiddenWords: brandRow.wordsToAvoid,
        allowedProof: brandRow.proofPoints,
      }),
      carousel: content,
    };
  }

  const theme = themeFromBrand(brandRow);
  const plan = planFromFormat(format, {
    title: input.title,
    productName: brandRow.name,
    audience: brandRow.audience,
    cta: brandRow.cta,
    forbiddenClaims: brandRow.wordsToAvoid,
  });
  const result = validateAndRepair(plan, theme, {
    forbiddenWords: brandRow.wordsToAvoid,
    allowedProof: brandRow.proofPoints,
  });
  addBrandLogo(result.carousel, brandRow.logoAssetId);
  const id = await persistNewCarousel(input.auth, result.carousel, result.plan, "manual");
  return {
    carousel_id: id,
    editor_url: editorUrl(id),
    status: "draft" as const,
    format_id: result.plan.formatId,
    validation: result.validation,
    carousel: result.carousel,
  };
}

export async function getCarousel(authContext: AuthContext, id: string) {
  const rows = await db
    .select({
      carousel: schema.carousel,
      project: schema.project,
    })
    .from(schema.carousel)
    .innerJoin(schema.project, eq(schema.project.id, schema.carousel.projectId))
    .where(eq(schema.carousel.id, id))
    .limit(1);
  const row = rows[0];
  if (!row || row.project.workspaceId !== authContext.workspaceId) {
    throw Object.assign(new Error("Carousel not found"), { status: 404, code: "NOT_FOUND" });
  }
  return row.carousel;
}

export async function deleteCarousel(authContext: AuthContext, id: string) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: schema.carousel.id })
      .from(schema.carousel)
      .innerJoin(schema.project, eq(schema.project.id, schema.carousel.projectId))
      .where(and(eq(schema.carousel.id, id), eq(schema.project.workspaceId, authContext.workspaceId)))
      .for("update", { of: schema.carousel });
    if (!row) {
      throw Object.assign(new Error("Carousel not found"), { status: 404, code: "NOT_FOUND" });
    }
    // Versions and publish jobs cascade; reusable workspace formats are kept.
    await tx.delete(schema.carousel).where(eq(schema.carousel.id, row.id));
    return { carousel_id: row.id, deleted: true };
  });
}

export async function getHistoricalCarousel(authContext: AuthContext, id: string, version: number) {
  const current = await getCarousel(authContext, id);
  if (!Number.isInteger(version) || version < 1) throw Object.assign(new Error("Provide a valid draft version."), { status: 400, code: "INVALID_VERSION" });
  if (current.version === version) return current;
  const [previous] = await db.select().from(schema.carouselVersion)
    .where(and(eq(schema.carouselVersion.carouselId, id), eq(schema.carouselVersion.version, version)))
    .orderBy(desc(schema.carouselVersion.createdAt)).limit(1);
  if (!previous) throw Object.assign(new Error("That draft version is no longer in the history."), { status: 404, code: "VERSION_NOT_FOUND" });
  const content = previous.contentJson as Carousel;
  return { ...current, version, contentJson: content, planJson: previous.planJson, title: content.metadata.title, lastMutationId: null };
}

export async function listProjects(authContext: AuthContext) {
  const projects = await db
    .select()
    .from(schema.project)
    .where(eq(schema.project.workspaceId, authContext.workspaceId))
    .orderBy(desc(schema.project.updatedAt));

  const carousels = await db
    .select()
    .from(schema.carousel)
    .innerJoin(schema.project, eq(schema.project.id, schema.carousel.projectId))
    .where(eq(schema.project.workspaceId, authContext.workspaceId))
    .orderBy(desc(schema.carousel.updatedAt));

  return {
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      updated_at: project.updatedAt,
    })),
    carousels: carousels.map(({ carousel: item }) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      format_id: item.formatId,
      editor_url: editorUrl(item.id),
      updated_at: item.updatedAt,
      slide_count: (item.contentJson as Carousel).slides.length,
      preview: {
        slide: (item.contentJson as Carousel).slides[0],
        theme: (item.contentJson as Carousel).theme,
      },
    })),
  };
}

export async function undoDepth(carouselId: string) {
  const rows = await db
    .select({ count: count() })
    .from(schema.carouselVersion)
    .where(eq(schema.carouselVersion.carouselId, carouselId));
  return rows[0]?.count ?? 0;
}

/** Restores the newest snapshot and drops it, so repeated calls walk the history back. */
export async function undoCarousel(authContext: AuthContext, id: string, expectedVersion?: number) {
  await getCarousel(authContext, id);
  return db.transaction(async (tx) => {
  const [current] = await tx.select().from(schema.carousel).where(eq(schema.carousel.id, id)).for("update");
  if (!current) throw Object.assign(new Error("Carousel not found"), { status: 404 });
  if (expectedVersion !== undefined && current.version !== expectedVersion) throw Object.assign(new Error("Carousel changed elsewhere. Reload before undoing."), { status: 409 });
  const previous = await tx
    .select()
    .from(schema.carouselVersion)
    .where(eq(schema.carouselVersion.carouselId, id))
    .orderBy(desc(schema.carouselVersion.createdAt), desc(schema.carouselVersion.version))
    .limit(1);
  const snapshotRow = previous[0];
  if (!snapshotRow) {
    throw Object.assign(new Error("Nothing left to undo"), {
      status: 400,
      code: "NOTHING_TO_UNDO",
    });
  }

  const nextVersion = current.version + 1;
  await tx
    .update(schema.carousel)
    .set({
      contentJson: snapshotRow.contentJson,
      title: (snapshotRow.contentJson as Carousel).metadata.title,
      formatId: (snapshotRow.contentJson as Carousel).metadata.formatId,
      status: "draft",
      lastMutationId: null,
      planJson: snapshotRow.planJson,
      version: nextVersion,
      updatedAt: new Date(),
    })
    .where(eq(schema.carousel.id, id));
  await tx.delete(schema.carouselVersion).where(eq(schema.carouselVersion.id, snapshotRow.id));
  const [depth] = await tx.select({ count: count() }).from(schema.carouselVersion).where(eq(schema.carouselVersion.carouselId, id));

  const content = snapshotRow.contentJson as Carousel;
  return {
    carousel_id: id,
    editor_url: editorUrl(id),
    version: nextVersion,
    undo_count: depth?.count ?? 0,
    validation: validateCarousel(content),
    carousel: content,
  };
  });
}

export async function updateCarousel(
  authContext: AuthContext,
  id: string,
  operations: unknown[],
  expectedVersion?: number,
  mutationId?: string,
) {
  const parsed = parseOperations(operations);
  if (!parsed || !parsed.length || parsed.length > 500 || (expectedVersion !== undefined && (!Number.isInteger(expectedVersion) || expectedVersion < 1)) || (mutationId !== undefined && (typeof mutationId !== "string" || mutationId.length > 100))) {
    throw Object.assign(new Error("That edit is not a supported operation"), {
      status: 400,
      code: "INVALID_OPERATION",
    });
  }
  await getCarousel(authContext, id);
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(schema.carousel).where(eq(schema.carousel.id, id)).for("update");
    if (!current) throw Object.assign(new Error("Carousel not found"), { status: 404 });
    if (mutationId && current.lastMutationId === mutationId) {
      return { carousel_id: id, version: current.version, carousel: current.contentJson, undo_count: await undoDepth(id) };
    }
    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      throw Object.assign(new Error("This carousel changed in another tab. Review the latest version before saving."), { status: 409, code: "VERSION_CONFLICT" });
    }
    let content: Carousel;
    try {
      content = applyOperations(current.contentJson as Carousel, parsed as CarouselOperation[]);
    } catch {
      throw Object.assign(new Error("That edit would leave the carousel in an invalid state"), { status: 400, code: "INVALID_OPERATION" });
    }
    for (const assetId of new Set(content.slides.flatMap((slide) => slide.elements.flatMap((element) => element.assetId ? [element.assetId] : [])))) {
      await getAsset(authContext, assetId);
    }
    await tx.insert(schema.carouselVersion).values({ id: sid("ver"), carouselId: id, version: current.version, contentJson: current.contentJson, planJson: current.planJson });
    const nextVersion = current.version + 1;
    const previousPlan = current.planJson as CarouselPlan | null;
    const plan = previousPlan ? planFromCarousel(content, previousPlan.product) : null;
    await tx.update(schema.carousel).set({ contentJson: content, planJson: plan, title: content.metadata.title, formatId: content.metadata.formatId, status: "draft", version: nextVersion, lastMutationId: mutationId ?? null, updatedAt: new Date() }).where(eq(schema.carousel.id, id));
    const [depth] = await tx.select({ count: count() }).from(schema.carouselVersion).where(eq(schema.carouselVersion.carouselId, id));
    return { carousel_id: id, editor_url: editorUrl(id), version: nextVersion, undo_count: depth?.count ?? 0, validation: validateCarousel(content), carousel: content };
  });
}

export async function generateSlide(
  authContext: AuthContext,
  id: string,
  slideId: string,
  instruction: string,
) {
  if (generationModelConfigured()) await assertUsage(authContext.workspaceId, "generation");
  const current = await getCarousel(authContext, id);
  const brandRow = await getWorkspaceBrand(authContext.workspaceId);
  if (!brandRow) {
    throw Object.assign(new Error("Brand kit missing"), { status: 400, code: "NO_BRAND" });
  }
  const content = current.contentJson as Carousel;
  const slideIndex = content.slides.findIndex((slide) => slide.id === slideId);
  if (slideIndex < 0) {
    throw Object.assign(new Error("Slide not found"), { status: 404, code: "INVALID_SLIDE" });
  }
  const previousPlan = current.planJson as CarouselPlan | null;
  const plan = planFromCarousel(content, previousPlan?.product ?? {
    name: brandRow.name,
    audience: brandRow.audience ?? undefined,
    cta: brandRow.cta ?? undefined,
    forbiddenClaims: brandRow.wordsToAvoid,
  });
  const { plan: nextPlan, source } = await reviseSlidePlan({
    plan,
    slideIndex,
    instruction,
    brand: toBrandContext(brandRow),
  });
  const revised = repairPlan(nextPlan).slides[slideIndex]!;
  const carousel = applySlideRevision(content, slideId, revised, () => sid("el"));
  carousel.metadata = {
    ...carousel.metadata,
    generationSource: source === "local" ? "local" : content.metadata.generationSource ?? source,
  };
  const validation = validateCarousel(carousel, {
    forbiddenWords: brandRow.wordsToAvoid,
    allowedProof: brandRow.proofPoints,
  });
  const committed = await withUsageTransaction(authContext.workspaceId, source === "model" ? ["generation"] : [], async (tx) => {
    const [latest] = await tx.select().from(schema.carousel).where(eq(schema.carousel.id, id)).for("update");
    if (!latest) throw Object.assign(new Error("Carousel no longer exists."), { status: 404, code: "NOT_FOUND" });
    if (latest.version !== current.version) {
      throw Object.assign(new Error("This carousel changed while the slide was being revised. Read the latest version and try again."), {
        status: 409, code: "VERSION_CONFLICT", details: { version: latest.version },
      });
    }
    await tx.insert(schema.carouselVersion).values({ id: sid("ver"), carouselId: id, version: latest.version, contentJson: latest.contentJson, planJson: latest.planJson });
    const version = latest.version + 1;
    await tx.update(schema.carousel).set({
      contentJson: carousel, planJson: planFromCarousel(carousel, plan.product), title: carousel.metadata.title,
      version, lastMutationId: null, status: "draft", updatedAt: new Date(),
    }).where(eq(schema.carousel.id, id));
    if (source === "model") await tx.insert(schema.usageEvent).values({ id: sid("use"), workspaceId: authContext.workspaceId, kind: "generation" });
    const [depth] = await tx.select({ count: count() }).from(schema.carouselVersion).where(eq(schema.carouselVersion.carouselId, id));
    return { version, undo_count: depth?.count ?? 0 };
  });
  const warnings: GenerationWarning[] = [
    ...(source === "local" ? [localGenerationWarning()] : []),
    ...(content.metadata.thinBrand ? [thinBrandWarning()] : []),
  ];
  const query = new URLSearchParams();
  if (source === "local") query.set("generation", "local");
  if (content.metadata.thinBrand) query.set("brand", "thin");
  const suffix = query.toString();
  return {
    carousel_id: id,
    editor_url: suffix ? `${editorUrl(id)}?${suffix}` : editorUrl(id),
    source,
    warnings,
    ...committed,
    validation,
    carousel,
  };
}

export async function validateExisting(authContext: AuthContext, id: string) {
  const current = await getCarousel(authContext, id);
  const brand = await getWorkspaceBrand(authContext.workspaceId);
  return { version: current.version, ...validateCarousel(current.contentJson as Carousel, {
    forbiddenWords: brand?.wordsToAvoid,
    allowedProof: brand?.proofPoints,
  }) };
}

export { renderPlanToCarousel };
