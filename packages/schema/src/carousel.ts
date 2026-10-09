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
  "icon",
  "logo",
  "badge",
  "line",
  "chart",
  "screenshot",
  "video",
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

export const backgroundSchema = z.object({
  type: z.enum(["solid", "gradient", "image"]),
  value: z.string(),
});

export const textStyleSchema = z.object({
  fontSize: z.number().positive(),
  fontWeight: z.number().min(100).max(900),
  align: z.enum(["left", "center", "right"]),
  color: z.string().optional(),
  lineHeight: z.number().positive().optional(),
  letterSpacing: z.number().optional(),
});

export const elementSchema = z.object({
  id: z.string().min(1),
  type: elementTypeSchema,
  role: elementRoleSchema.optional(),
  text: z.string().optional(),
  assetId: z.string().optional(),
  src: z.string().optional(),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  style: textStyleSchema.optional(),
});

export const slideSchema = z.object({
  id: z.string().min(1),
  layout: layoutTypeSchema,
  role: z.string().min(1),
  background: backgroundSchema,
  elements: z.array(elementSchema).min(1),
});

export const themeSchema = z.object({
  background: z.string(),
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
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
  slides: z.array(slideSchema).min(1),
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
