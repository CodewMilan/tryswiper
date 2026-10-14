import { and, asc, count, desc, eq, ilike, inArray, lt, or, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
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
  FORMATS,
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
  type ValidationResult,
} from "@swiper/schema";
import { schema } from "@swiper/db";
import type { AuthContext } from "../lib/api-auth";
import { db } from "../lib/db";
import { sid } from "../lib/ids";
import { editorUrl } from "../lib/utils";
import { getWorkspaceBrand } from "../lib/workspace";
import { getWorkspaceFormat } from "./workspace-formats";
import { assetsForWorkspace } from "./assets";
import {
  isThinBrand,
  localGenerationWarning,
  thinBrandWarning,
  type GenerationWarning,
} from "@/lib/generation-notices";
import { assertUsage, recordUsage, withUsageTransaction, type UsageTransaction } from "./usage";
import { recordProductEvent } from "./product-events";
import type { CreationRequest } from "@/lib/creation-request";
import { assertDocumentStorage, withResourceBudget } from "./resource-budget";
import { decodeAssets, textFitIssues } from "@swiper/rendering";

function validateOutput(carousel: Carousel, options?: Parameters<typeof validateCarousel>[1]) {
  const result = validateCarousel(carousel, options);
  if (result.errors.some((issue) => issue.code === "INVALID_SCHEMA")) return result;
  const measured = textFitIssues(carousel);
  const errors = [...result.errors, ...measured.filter((issue) => issue.severity === "error")];
  return { ...result, ok: errors.length === 0, errors, warnings: [...result.warnings, ...measured.filter((issue) => issue.severity === "warning")] };
}

type CreationResult = { carousel_id: string; editor_url: string; status: "draft"; format_id: string; carousel: Carousel; validation: ValidationResult;
  source?: "model" | "local"; warnings?: GenerationWarning[]; request_ref?: string };
type RevisionResult = { carousel_id: string; editor_url: string; source: "model" | "local"; warnings: GenerationWarning[];
  version: number; undo_count: number; validation: ValidationResult; carousel: Carousel; request_ref?: string };

function generationRef(request?: CreationRequest) { return request ? createHash("sha256").update(request.key).digest("hex").slice(0, 16) : sid("run"); }

async function replayRequest<T = CreationResult>(auth: AuthContext, request?: CreationRequest, reader: Pick<typeof db, "select"> = db): Promise<T | null> {
  if (!request) return null;
  const [receipt] = await reader.select().from(schema.creationRequest).where(and(eq(schema.creationRequest.workspaceId, auth.workspaceId), eq(schema.creationRequest.requestKey, request.key))).limit(1);
  if (!receipt) return null;
  if (receipt.payloadHash !== request.hash) throw Object.assign(new Error("This request ID was already used for a different brief. Start a new request."), { status: 409, code: "REQUEST_ID_REUSED" });
  if (!receipt.carouselId) throw Object.assign(new Error("The carousel from this request was deleted. Start a new request to create another draft."), { status: 410, code: "CREATED_DRAFT_DELETED" });
  if (Date.now() - receipt.createdAt.getTime() > 30 * 86400000 || (receipt.resultJson as { expired?: boolean }).expired) throw Object.assign(new Error("The saved response expired after 30 days. Open the existing draft, or use a new request ID for new work."), { status: 410, code: "REQUEST_EXPIRED", details: { carousel_id: receipt.carouselId } });
  return receipt.resultJson as T;
}

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

async function persistNewCarousel(auth: AuthContext, content: Carousel, plan: CarouselPlan | null, method: "agent" | "manual", modelUsed: boolean,
  request: CreationRequest | undefined, response: (id: string) => CreationResult) {
  return withUsageTransaction(auth.workspaceId, modelUsed ? ["carousel", "generation"] : ["carousel"], async (tx) => {
    for (const assetId of new Set(content.slides.flatMap((slide) => slide.elements.flatMap((element) => element.assetId ? [element.assetId] : [])))) {
      const [asset] = await tx.select({ id: schema.asset.id }).from(schema.asset).where(and(eq(schema.asset.id, assetId), eq(schema.asset.workspaceId, auth.workspaceId)));
      if (!asset) throw Object.assign(new Error("A saved image was removed. Replace it before creating this draft."), { status: 422, code: "MISSING_ASSET" });
    }
    const project = await namedProject(auth, method === "agent" ? "Agent carousels" : "Drafts", method === "agent" ? "Carousels created through MCP" : "Carousels started in the browser", tx);
    const id = sid("car");
    await tx.insert(schema.carousel).values({ id, projectId: project.id, title: content.metadata.title, formatId: content.metadata.formatId,
      status: "draft", contentJson: content, planJson: plan, createdBy: auth.userId });
    await recordUsage(auth.workspaceId, "carousel", tx);
    await recordProductEvent(auth.workspaceId, "created", id, { source: content.metadata.generationSource ?? "manual", value: auth.source }, tx);
    if (modelUsed) await recordUsage(auth.workspaceId, "generation", tx);
    const result = response(id);
    if (request) await tx.insert(schema.creationRequest).values({ id: sid("req"), workspaceId: auth.workspaceId, requestKey: request.key, payloadHash: request.hash, carouselId: id, resultJson: result });
    await pruneRequestResults(tx, auth.workspaceId);
    await assertDocumentStorage(auth.workspaceId, tx);
    return result;
  }, async (tx) => { const previous = await replayRequest(auth, request, tx); return previous ? { value: previous } : null; });
}

export async function generateCarousel(input: {
  auth: AuthContext;
  brief: string;
  title?: string;
  formatId?: string;
  slideCount?: number;
  request?: CreationRequest;
}) {
  const previous = await replayRequest(input.auth, input.request);
  if (previous) return previous;
  let formatId = input.formatId;
  const workspaceFormat = formatId && !getFormat(formatId) ? await getWorkspaceFormat(input.auth, formatId) : null;
  if (formatId && !getFormat(formatId) && !workspaceFormat) throw Object.assign(new Error("Choose an available official or saved workspace format."), { status: 400, code: "UNKNOWN_FORMAT" });
  if (workspaceFormat && input.slideCount !== undefined && input.slideCount !== workspaceFormat.contentJson.slides.length) throw Object.assign(new Error("A saved format keeps its original slide count."), { status: 400, code: "INVALID_SLIDE_COUNT" });
  if (!workspaceFormat && input.slideCount !== undefined) {
    const format = formatId ? getFormat(formatId) : FORMATS.find((candidate) => input.slideCount! >= candidate.slideCount.min && input.slideCount! <= candidate.slideCount.max);
    if (!Number.isInteger(input.slideCount) || input.slideCount < 3 || input.slideCount > 12 || !format || input.slideCount < format.slideCount.min || input.slideCount > format.slideCount.max) {
      throw Object.assign(new Error(format ? `${format.name} supports ${format.slideCount.min}–${format.slideCount.max} slides.` : "No current story format supports that slide count. Pick a supported format and count."), { status: 400, code: "INVALID_SLIDE_COUNT" });
    }
    formatId = format.id;
  }
  await assertUsage(input.auth.workspaceId, "carousel");
  if (generationModelConfigured()) await assertUsage(input.auth.workspaceId, "generation");
  const brandRow = await getWorkspaceBrand(input.auth.workspaceId);
  if (!brandRow) {
    throw Object.assign(new Error("Brand kit missing"), { status: 400, code: "NO_BRAND" });
  }
  const brand = toBrandContext(brandRow);
  const theme = themeFromBrand(brandRow);
  const thinBrand = isThinBrand(brandRow);
  const requestRef = generationRef(input.request);
  const writePlan = () => generatePlan({
    brief: input.brief,
    formatId,
    slideCount: input.slideCount,
    brand,
    requestRef,
    template: workspaceFormat ? { ...planFromCarousel(workspaceFormat.contentJson, { name: brand.name, forbiddenClaims: brand.wordsToAvoid ?? [] }), formatId: workspaceFormat.id } : undefined,
  });
  const { plan, source } = generationModelConfigured() ? await withResourceBudget(input.auth.workspaceId, "generation", writePlan) : await writePlan();
  if (input.title) plan.title = input.title;
  const result = validateAndRepair(plan, theme, {
    forbiddenWords: brand.wordsToAvoid,
    allowedProof: brand.proofPoints,
  });
  if (workspaceFormat) {
    result.carousel = instantiateCarouselTemplate(workspaceFormat.contentJson, { formatId: workspaceFormat.id, title: result.plan.title, newId: (kind) => sid(kind === "slide" ? "sld" : "el") });
    for (const [index, slide] of result.carousel.slides.entries()) for (const element of slide.elements) {
      if (element.type === "text" && element.role && ["headline", "kicker", "body", "proof", "cta"].includes(element.role)) {
        element.text = result.plan.slides[index]?.[element.role as "headline" | "kicker" | "body" | "proof" | "cta"] ?? "";
      }
    }
  } else addBrandLogo(result.carousel, brandRow.logoAssetId);
  result.validation = validateOutput(result.carousel, { forbiddenWords: brandRow.wordsToAvoid, allowedProof: brandRow.proofPoints });
  result.carousel.metadata = {
    ...result.carousel.metadata,
    generationSource: source,
    ...(thinBrand ? { thinBrand: true } : {}),
  };
  const warnings: GenerationWarning[] = [
    ...(source === "local" ? [localGenerationWarning()] : []),
    ...(thinBrand ? [thinBrandWarning()] : []),
  ];
  const query = new URLSearchParams();
  if (source === "local") query.set("generation", "local");
  if (thinBrand) query.set("brand", "thin");
  const suffix = query.toString();
  return persistNewCarousel(input.auth, result.carousel, result.plan, "agent", source === "model", input.request, (id) => ({
    carousel_id: id,
    editor_url: suffix ? `${editorUrl(id)}?${suffix}` : editorUrl(id),
    status: "draft" as const,
    format_id: result.plan.formatId,
    source,
    request_ref: requestRef,
    warnings,
    validation: result.validation,
    carousel: result.carousel,
  }));
}

export async function startCarouselFromFormat(input: {
  auth: AuthContext;
  formatId: string;
  title?: string;
  request?: CreationRequest;
}) {
  const previous = await replayRequest(input.auth, input.request);
  if (previous) return previous;
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
    const result = await persistNewCarousel(input.auth, content, plan, "manual", false, input.request, (id) => ({
      carousel_id: id, editor_url: editorUrl(id), status: "draft", format_id: workspaceFormat.id,
      validation: validateOutput(content, { forbiddenWords: brandRow.wordsToAvoid, allowedProof: brandRow.proofPoints }), carousel: content,
    }));
    console.info("carousel_started_from_workspace_format", {
      carouselId: result.carousel_id,
      formatId: workspaceFormat.id,
      workspaceId: input.auth.workspaceId,
    });
    return result;
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
  result.validation = validateOutput(result.carousel, { forbiddenWords: brandRow.wordsToAvoid, allowedProof: brandRow.proofPoints });
  return persistNewCarousel(input.auth, result.carousel, result.plan, "manual", false, input.request, (id) => ({
    carousel_id: id,
    editor_url: editorUrl(id),
    status: "draft" as const,
    format_id: result.plan.formatId,
    validation: result.validation,
    carousel: result.carousel,
  }));
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

export async function deleteCarousel(authContext: AuthContext, id: string, expectedVersion?: number) {
  if (expectedVersion !== undefined && (!Number.isInteger(expectedVersion) || expectedVersion < 1)) throw Object.assign(new Error("Provide a positive expected version."), { status: 400, code: "INVALID_VERSION" });
  return db.transaction(async (tx) => {
    await tx.select({ id: schema.workspace.id }).from(schema.workspace).where(eq(schema.workspace.id, authContext.workspaceId)).for("no key update");
    const [row] = await tx
      .select({ id: schema.carousel.id, version: schema.carousel.version })
      .from(schema.carousel)
      .innerJoin(schema.project, eq(schema.project.id, schema.carousel.projectId))
      .where(and(eq(schema.carousel.id, id), eq(schema.project.workspaceId, authContext.workspaceId)))
      .for("update", { of: schema.carousel });
    if (!row) {
      throw Object.assign(new Error("Carousel not found"), { status: 404, code: "NOT_FOUND" });
    }
    // Versions and publish jobs cascade; reusable workspace formats are kept.
    if (expectedVersion !== undefined && row.version !== expectedVersion) throw Object.assign(new Error("The draft changed. Review it before deleting."), { status: 409, code: "VERSION_CONFLICT", details: { current_version: row.version } });
    await tx.update(schema.creationRequest).set({ resultJson: { deleted: true } }).where(eq(schema.creationRequest.carouselId, row.id));
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

export async function listProjects(authContext: AuthContext, options: { offset?: number; limit?: number; query?: string; sort?: string } = {}) {
  const offset = options.offset ?? 0, limit = options.limit ?? 25, query = options.query?.trim() ?? "";
  if (!Number.isInteger(offset) || offset < 0 || offset > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 50 || query.length > 100) throw Object.assign(new Error("Provide a valid library page (1–50 items) and a short search."), { status: 400, code: "INVALID_PAGE" });
  const formatIds = FORMATS.filter((format) => format.name.toLowerCase().includes(query.toLowerCase())).map((format) => format.id);
  const filter = and(eq(schema.project.workspaceId, authContext.workspaceId), query ? or(ilike(schema.carousel.title, `%${query}%`), ilike(schema.carousel.formatId, `%${query}%`), formatIds.length ? inArray(schema.carousel.formatId, formatIds) : undefined) : undefined);
  const [projects, carousels, [total]] = await Promise.all([
    db.select().from(schema.project).where(eq(schema.project.workspaceId, authContext.workspaceId)).orderBy(desc(schema.project.updatedAt)).limit(50),
    db.select({ id: schema.carousel.id, title: schema.carousel.title, status: schema.carousel.status, formatId: schema.carousel.formatId, version: schema.carousel.version,
      updatedAt: schema.carousel.updatedAt, slideCount: sql<number>`jsonb_array_length(${schema.carousel.contentJson}->'slides')`,
      slide: sql<Carousel["slides"][number]>`${schema.carousel.contentJson}->'slides'->0`, theme: sql<Theme>`${schema.carousel.contentJson}->'theme'` })
      .from(schema.carousel).innerJoin(schema.project, eq(schema.project.id, schema.carousel.projectId)).where(filter)
      .orderBy(options.sort === "title" ? asc(schema.carousel.title) : desc(schema.carousel.updatedAt), desc(schema.carousel.id)).limit(limit).offset(offset),
    db.select({ value: count() }).from(schema.carousel).innerJoin(schema.project, eq(schema.project.id, schema.carousel.projectId)).where(filter),
  ]);
  return { projects: projects.map((project) => ({ id: project.id, name: project.name, status: project.status, updated_at: project.updatedAt })),
    carousels: carousels.map((item) => ({ id: item.id, title: item.title, status: item.status, version: item.version, format_id: item.formatId, editor_url: editorUrl(item.id), updated_at: item.updatedAt, slide_count: Number(item.slideCount), preview: { slide: item.slide, theme: item.theme } })),
    total: Number(total?.value ?? 0), next_offset: offset + carousels.length < Number(total?.value ?? 0) ? offset + carousels.length : null,
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
    await tx.select({ id: schema.workspace.id }).from(schema.workspace).where(eq(schema.workspace.id, authContext.workspaceId)).for("no key update");
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
    validation: validateOutput(content),
    carousel: content,
  };
  });
}

async function retainUndoHistory(tx: UsageTransaction, id: string) {
  const older = await tx.select({ id: schema.carouselVersion.id }).from(schema.carouselVersion).where(eq(schema.carouselVersion.carouselId, id)).orderBy(desc(schema.carouselVersion.createdAt), desc(schema.carouselVersion.version)).offset(100);
  if (older.length) await tx.delete(schema.carouselVersion).where(inArray(schema.carouselVersion.id, older.map((row) => row.id)));
}

async function pruneRequestResults(tx: UsageTransaction, workspaceId: string) {
  await tx.update(schema.creationRequest).set({ resultJson: { expired: true } }).where(and(eq(schema.creationRequest.workspaceId, workspaceId), lt(schema.creationRequest.createdAt, new Date(Date.now() - 30 * 86400000)), sql`${schema.creationRequest.resultJson} ? 'carousel'`));
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
    await tx.select({ id: schema.workspace.id }).from(schema.workspace).where(eq(schema.workspace.id, authContext.workspaceId)).for("no key update");
    const [current] = await tx.select().from(schema.carousel).where(eq(schema.carousel.id, id)).for("update");
    if (!current) throw Object.assign(new Error("Carousel not found"), { status: 404 });
    if (mutationId && current.lastMutationId === mutationId) {
      return { carousel_id: id, version: current.version, carousel: current.contentJson, undo_count: await undoDepth(id) };
    }
    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      throw Object.assign(new Error("This carousel changed elsewhere. Review the latest version before saving."), { status: 409, code: "VERSION_CONFLICT", details: { current_version: current.version } });
    }
    let content: Carousel;
    try {
      content = applyOperations(current.contentJson as Carousel, parsed as CarouselOperation[]);
    } catch {
      throw Object.assign(new Error("That edit would leave the carousel in an invalid state"), { status: 400, code: "INVALID_OPERATION" });
    }
    for (const assetId of new Set(content.slides.flatMap((slide) => slide.elements.flatMap((element) => element.assetId ? [element.assetId] : [])))) {
      const [asset] = await tx.select({ id: schema.asset.id }).from(schema.asset).where(and(eq(schema.asset.id, assetId), eq(schema.asset.workspaceId, authContext.workspaceId)));
      if (!asset) throw Object.assign(new Error("A referenced image is unavailable."), { status: 422, code: "MISSING_ASSET" });
    }
    await tx.insert(schema.carouselVersion).values({ id: sid("ver"), carouselId: id, version: current.version, contentJson: current.contentJson, planJson: current.planJson });
    await retainUndoHistory(tx, id);
    const nextVersion = current.version + 1;
    const previousPlan = current.planJson as CarouselPlan | null;
    const plan = previousPlan ? planFromCarousel(content, previousPlan.product) : null;
    await tx.update(schema.carousel).set({ contentJson: content, planJson: plan, title: content.metadata.title, formatId: content.metadata.formatId, status: "draft", version: nextVersion, lastMutationId: mutationId ?? null, updatedAt: new Date() }).where(eq(schema.carousel.id, id));
    const [depth] = await tx.select({ count: count() }).from(schema.carouselVersion).where(eq(schema.carouselVersion.carouselId, id));
    await recordProductEvent(authContext.workspaceId, "edited", id, { source: authContext.source }, tx);
    await pruneRequestResults(tx, authContext.workspaceId);
    await assertDocumentStorage(authContext.workspaceId, tx);
    return { carousel_id: id, editor_url: editorUrl(id), version: nextVersion, undo_count: depth?.count ?? 0, validation: validateOutput(content), carousel: content };
  });
}

export async function generateSlide(
  authContext: AuthContext,
  id: string,
  slideId: string,
  instruction: string,
  request?: CreationRequest,
) {
  const previous = await replayRequest<RevisionResult>(authContext, request);
  if (previous) return previous;
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
  const requestRef = generationRef(request);
  const revise = () => reviseSlidePlan({
    plan,
    slideIndex,
    instruction,
    requestRef,
    brand: toBrandContext(brandRow),
  });
  const { plan: nextPlan, source } = generationModelConfigured() ? await withResourceBudget(authContext.workspaceId, "generation", revise) : await revise();
  const revised = repairPlan(nextPlan).slides[slideIndex]!;
  const carousel = applySlideRevision(content, slideId, revised, () => sid("el"));
  carousel.metadata = {
    ...carousel.metadata,
    generationSource: source === "local" ? "local" : content.metadata.generationSource ?? source,
  };
  const validation = validateOutput(carousel, {
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
    await retainUndoHistory(tx, id);
    await recordProductEvent(authContext.workspaceId, "revised", id, { source, value: authContext.source }, tx);
    const version = latest.version + 1;
    await tx.update(schema.carousel).set({
      contentJson: carousel, planJson: planFromCarousel(carousel, plan.product), title: carousel.metadata.title,
      version, lastMutationId: null, status: "draft", updatedAt: new Date(),
    }).where(eq(schema.carousel.id, id));
    if (source === "model") await recordUsage(authContext.workspaceId, "generation", tx);
    const [depth] = await tx.select({ count: count() }).from(schema.carouselVersion).where(eq(schema.carouselVersion.carouselId, id));
    const warnings: GenerationWarning[] = [
      ...(source === "local" ? [localGenerationWarning()] : []), ...(content.metadata.thinBrand ? [thinBrandWarning()] : []),
    ];
    const query = new URLSearchParams();
    if (source === "local") query.set("generation", "local");
    if (content.metadata.thinBrand) query.set("brand", "thin");
    const result: RevisionResult = { carousel_id: id, editor_url: query.size ? `${editorUrl(id)}?${query}` : editorUrl(id),
      source, warnings, version, undo_count: depth?.count ?? 0, validation, carousel, request_ref: requestRef };
    if (request) await tx.insert(schema.creationRequest).values({ id: sid("req"), workspaceId: authContext.workspaceId,
      requestKey: request.key, payloadHash: request.hash, carouselId: id, resultJson: result });
    await pruneRequestResults(tx, authContext.workspaceId);
    await assertDocumentStorage(authContext.workspaceId, tx);
    return result;
  }, async (tx) => { const previous = await replayRequest<RevisionResult>(authContext, request, tx); return previous ? { value: previous } : null; });
  return committed;
}

export async function validateExisting(authContext: AuthContext, id: string) {
  const current = await getCarousel(authContext, id);
  const brand = await getWorkspaceBrand(authContext.workspaceId);
  const content = current.contentJson as Carousel;
  const validation = validateOutput(content, {
    forbiddenWords: brand?.wordsToAvoid,
    allowedProof: brand?.proofPoints,
  });
  if (!validation.errors.some((issue) => issue.code === "INVALID_SCHEMA")) {
    try {
      const assetIds = content.slides.flatMap((slide) => slide.elements.flatMap((element) => element.assetId ? [element.assetId] : []));
      if (assetIds.length) {
        const assets = await assetsForWorkspace(authContext.workspaceId, assetIds);
        await withResourceBudget(authContext.workspaceId, "render", () => decodeAssets(assets));
      }
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || !["MISSING_ASSET", "UNREADABLE_ASSET", "RENDER_ASSET_BUDGET"].includes(String(error.code))) throw error;
      validation.errors.push({ code: String(error.code), message: error.message, severity: "error", suggestedAction: "replace_image" });
      validation.ok = false;
    }
  }
  await recordProductEvent(authContext.workspaceId, "checked", id, { source: authContext.source, value: validation.ok ? "passed" : "issues" });
  return { version: current.version, ...validation };
}

export { renderPlanToCarousel };
