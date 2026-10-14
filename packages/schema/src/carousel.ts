import { z } from "zod";
import { ASPECT_RATIO, SCHEMA_VERSION } from "./canvas";

export const layoutTypeSchema = z.enum([
  "hero",
  "centered",
  "split",
  "image-left",
  "image-right",
  "quote",
  "list",
  "comparison",
  "cta",
]);

export const elementTypeSchema = z.enum([
  "text",
  "image",
  "shape",
  "logo",
  "line",
]);

export const elementRoleSchema = z.enum([
  "headline",
  "subhead",
  "body",
  "caption",
  "cta",
  "kicker",
  "proof",
  "label",
  "annotation",
]);

export const colorSchema = z.string().regex(/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i, "Use a hex color.");
const opaqueColorSchema = z.string().regex(/^#(?:[\da-f]{3}|[\da-f]{6})$/i, "Use an opaque hex color.");
export const backgroundSchema = z.object({
  type: z.literal("solid"),
  value: opaqueColorSchema,
}).strict();

export const textStyleSchema = z.object({
  fontSize: z.number().positive().max(240),
  fontWeight: z.number().min(100).max(900),
  align: z.enum(["left", "center", "right"]),
  color: colorSchema.optional(),
  lineHeight: z.number().positive().max(5).optional(),
  letterSpacing: z.number().min(-20).max(100).optional(),
}).strict();

export const elementSchema = z.object({
  id: z.string().min(1),
  type: elementTypeSchema,
  role: elementRoleSchema.optional(),
  text: z.string().max(10000).optional(),
  assetId: z.string().max(120).optional().describe("Required for image/logo elements: an owned uploaded asset ID."),
  src: z.string().max(160).optional().describe("Optional canonical /api/v1/assets/{assetId} URL; remote sources are unsupported."),
  x: z.number(),
  y: z.number(),
  width: z.number().positive().max(1080),
  height: z.number().positive().max(1350),
  style: textStyleSchema.optional(),
}).strict().superRefine((element, ctx) => {
  if (element.type === "image" || element.type === "logo") {
    if (!element.assetId || !/^[a-zA-Z0-9_-]+$/.test(element.assetId)) ctx.addIssue({ code: "custom", path: ["assetId"], message: "Images and logos require an uploaded asset ID." });
    if (element.src !== undefined && element.src !== `/api/v1/assets/${element.assetId}`) ctx.addIssue({ code: "custom", path: ["src"], message: "Image source must match its uploaded asset URL." });
  } else if (element.assetId || element.src) {
    ctx.addIssue({ code: "custom", path: ["type"], message: "Only images and logos can reference an asset." });
  }
});

export const slideSchema = z.object({
  id: z.string().min(1),
  layout: layoutTypeSchema,
  role: z.string().min(1),
  background: backgroundSchema,
  elements: z.array(elementSchema).min(1).max(100),
});

export const themeSchema = z.object({
  background: opaqueColorSchema,
  primary: opaqueColorSchema,
  secondary: opaqueColorSchema,
  accent: opaqueColorSchema,
  fontFamily: z.string(),
  bodyFontFamily: z.string().optional(),
});

export const productContextSchema = z.object({
  name: z.string(),
  category: z.string().optional(),
  audience: z.string().optional(),
  problem: z.string().optional(),
  differentiator: z.string().optional(),
  proof: z.string().optional(),
  cta: z.string().optional(),
  forbiddenClaims: z.array(z.string()).default([]),
});

export const slidePlanSchema = z.object({
  role: z.string().min(1),
  layout: layoutTypeSchema,
  kicker: z.string().optional(),
  headline: z.string().min(1),
  body: z.string().optional(),
  proof: z.string().optional(),
  cta: z.string().optional(),
  emphasis: z.array(z.string()).optional(),
  visualIntent: z.string().optional(),
});

export const carouselPlanSchema = z.object({
  title: z.string().min(1),
  formatId: z.string().min(1),
  product: productContextSchema,
  slides: z.array(slidePlanSchema).min(3).max(12),
});

export const carouselMetadataSchema = z.object({
  title: z.string().min(1),
  formatId: z.string().min(1),
  aspectRatio: z.literal(ASPECT_RATIO).default(ASPECT_RATIO),
  platforms: z.array(z.string()).default(["instagram", "linkedin"]),
  generationSource: z.enum(["model", "local"]).optional(),
  thinBrand: z.boolean().optional(),
});

export const carouselSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  metadata: carouselMetadataSchema,
  theme: themeSchema,
  slides: z.array(slideSchema).min(1).max(12),
}).superRefine((carousel, ctx) => {
  const length = carousel.slides.reduce((total, slide) => total + slide.elements.reduce((sum, element) => sum + (element.text?.length ?? 0), 0), 0);
  if (length > 50000) ctx.addIssue({ code: "custom", message: "A document can contain at most 50,000 text characters." });
});

export type LayoutType = z.infer<typeof layoutTypeSchema>;
export type ElementType = z.infer<typeof elementTypeSchema>;
export type ElementRole = z.infer<typeof elementRoleSchema>;
export type CarouselElement = z.infer<typeof elementSchema>;
export type Slide = z.infer<typeof slideSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type ProductContext = z.infer<typeof productContextSchema>;
export type SlidePlan = z.infer<typeof slidePlanSchema>;
export type CarouselPlan = z.infer<typeof carouselPlanSchema>;
export type Carousel = z.infer<typeof carouselSchema>;

export const DEFAULT_THEME: Theme = {
  background: "#FAFAF8",
  primary: "#171717",
  secondary: "#525252",
  accent: "#C2410C",
  fontFamily: "Inter",
};
