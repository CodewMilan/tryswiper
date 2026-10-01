import { and, desc, eq } from "drizzle-orm";
import {
  type BrandContext,
  generatePlan,
  reviseSlidePlan,
} from "@swiper/ai";
import {
  applyOperations,
  carouselOperationSchema,
  DEFAULT_THEME,
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

function themeFromBrand(brand: NonNullable<Awaited<ReturnType<typeof getWorkspaceBrand>>>): Theme {
  return {
    background: brand.colors.background ?? DEFAULT_THEME.background,
    primary: brand.colors.primary ?? DEFAULT_THEME.primary,
    secondary: brand.colors.secondary ?? DEFAULT_THEME.secondary,
    accent: brand.colors.accent ?? DEFAULT_THEME.accent,
    fontFamily: brand.fonts.heading ?? DEFAULT_THEME.fontFamily,
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
  };
}

async function snapshot(carouselId: string, version: number, content: unknown, plan: unknown) {
  await db.insert(schema.carouselVersion).values({
    id: sid("ver"),
    carouselId,
    version,
    contentJson: content,
    planJson: plan,
  });
}

async function agentProject(authContext: AuthContext) {
  const existing = await db
    .select()
    .from(schema.project)
    .where(
      and(
        eq(schema.project.workspaceId, authContext.workspaceId),
        eq(schema.project.name, "Agent carousels"),
      ),
    )
    .limit(1);
  if (existing[0]) return existing[0];

  const brand = await getWorkspaceBrand(authContext.workspaceId);
  const [created] = await db
    .insert(schema.project)
    .values({
      id: sid("prj"),
      workspaceId: authContext.workspaceId,
      brandId: brand?.id,
      name: "Agent carousels",
      description: "Carousels created through MCP",
      createdBy: authContext.userId,
    })
    .returning();
  return created!;
}

export async function generateCarousel(input: {
  auth: AuthContext;
  brief: string;
  title?: string;
  formatId?: string;
  slideCount?: number;
}) {
  const brandRow = await getWorkspaceBrand(input.auth.workspaceId);
  if (!brandRow) {
    throw Object.assign(new Error("Brand kit missing"), { status: 400, code: "NO_BRAND" });
  }
  const brand = toBrandContext(brandRow);
  const theme = themeFromBrand(brandRow);
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
  const project = await agentProject(input.auth);
  const id = sid("car");
  await db.insert(schema.carousel).values({
    id,
    projectId: project.id,
    title: result.plan.title,
    formatId: result.plan.formatId,
    status: "draft",
    contentJson: result.carousel,
    planJson: result.plan,
    createdBy: input.auth.userId,
  });
  return {
    carousel_id: id,
    editor_url: editorUrl(id),
    status: "draft" as const,
    format_id: result.plan.formatId,
    source,
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
    })),
  };
}

export async function updateCarousel(
  authContext: AuthContext,
  id: string,
  operations: unknown[],
) {
  const parsed = operations.map((operation) => carouselOperationSchema.parse(operation));
  const current = await getCarousel(authContext, id);
  await snapshot(current.id, current.version, current.contentJson, current.planJson);
  const content = applyOperations(current.contentJson as Carousel, parsed as CarouselOperation[]);
  const validation = validateCarousel(content);
  const nextVersion = current.version + 1;
  await db
    .update(schema.carousel)
    .set({
      contentJson: content,
      version: nextVersion,
      updatedAt: new Date(),
    })
    .where(eq(schema.carousel.id, id));
  return {
    carousel_id: id,
    editor_url: editorUrl(id),
    version: nextVersion,
    validation,
    carousel: content,
  };
}

export async function generateSlide(
  authContext: AuthContext,
  id: string,
  slideId: string,
  instruction: string,
) {
  const current = await getCarousel(authContext, id);
  const brandRow = await getWorkspaceBrand(authContext.workspaceId);
  if (!brandRow) {
    throw Object.assign(new Error("Brand kit missing"), { status: 400, code: "NO_BRAND" });
  }
  const plan = current.planJson as CarouselPlan | null;
  if (!plan) {
    throw Object.assign(new Error("This carousel has no generation plan to revise"), {
      status: 400,
      code: "NO_PLAN",
    });
  }
  const content = current.contentJson as Carousel;
  const slideIndex = content.slides.findIndex((slide) => slide.id === slideId);
  if (slideIndex < 0) {
    throw Object.assign(new Error("Slide not found"), { status: 404, code: "INVALID_SLIDE" });
  }
  await snapshot(current.id, current.version, current.contentJson, current.planJson);
  const nextPlan = await reviseSlidePlan({
    plan,
    slideIndex,
    instruction,
    brand: toBrandContext(brandRow),
  });
  const result = validateAndRepair(nextPlan, content.theme, {
    forbiddenWords: brandRow.wordsToAvoid,
    allowedProof: brandRow.proofPoints,
  });
  const nextVersion = current.version + 1;
  await db
    .update(schema.carousel)
    .set({
      contentJson: result.carousel,
      planJson: result.plan,
      version: nextVersion,
      updatedAt: new Date(),
    })
    .where(eq(schema.carousel.id, id));
  return {
    carousel_id: id,
    editor_url: editorUrl(id),
    version: nextVersion,
    validation: result.validation,
    carousel: result.carousel,
  };
}

export async function validateExisting(authContext: AuthContext, id: string) {
  const current = await getCarousel(authContext, id);
  const brand = await getWorkspaceBrand(authContext.workspaceId);
  return validateCarousel(current.contentJson as Carousel, {
    forbiddenWords: brand?.wordsToAvoid,
    allowedProof: brand?.proofPoints,
  });
}

export { renderPlanToCarousel };
