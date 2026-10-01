import { z } from "zod";
import {
  carouselSchema,
  elementSchema,
  slideSchema,
  type Carousel,
} from "./carousel";

export const carouselOperationSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("replace_slide_content"),
    slideId: z.string(),
    elements: z.array(elementSchema),
  }),
  z.object({
    op: z.literal("insert_slide"),
    index: z.number().int().min(0),
    slide: slideSchema,
  }),
  z.object({
    op: z.literal("delete_slide"),
    slideId: z.string(),
  }),
  z.object({
    op: z.literal("reorder_slide"),
    slideId: z.string(),
    toIndex: z.number().int().min(0),
  }),
  z.object({
    op: z.literal("set_background"),
    slideId: z.string(),
    background: z.object({
      type: z.enum(["solid", "gradient", "image"]),
      value: z.string(),
    }),
  }),
  z.object({
    op: z.literal("set_layout"),
    slideId: z.string(),
    layout: slideSchema.shape.layout,
  }),
  z.object({
    op: z.literal("update_cta"),
    text: z.string().min(1),
  }),
  z.object({
    op: z.literal("update_text"),
    slideId: z.string(),
    elementId: z.string(),
    text: z.string(),
  }),
]);

export type CarouselOperation = z.infer<typeof carouselOperationSchema>;

export function applyOperations(
  carousel: Carousel,
  operations: CarouselOperation[],
): Carousel {
  let next: Carousel = JSON.parse(JSON.stringify(carousel)) as Carousel;

  for (const operation of operations) {
    if (operation.op === "replace_slide_content") {
      next.slides = next.slides.map((slide) =>
        slide.id === operation.slideId ? { ...slide, elements: operation.elements } : slide,
      );
    } else if (operation.op === "insert_slide") {
      const slides = [...next.slides];
      slides.splice(operation.index, 0, operation.slide);
      next.slides = slides;
    } else if (operation.op === "delete_slide") {
      next.slides = next.slides.filter((slide) => slide.id !== operation.slideId);
    } else if (operation.op === "reorder_slide") {
      const from = next.slides.findIndex((slide) => slide.id === operation.slideId);
      if (from >= 0) {
        const slides = [...next.slides];
        const [moved] = slides.splice(from, 1);
        if (moved) slides.splice(operation.toIndex, 0, moved);
        next.slides = slides;
      }
    } else if (operation.op === "set_background") {
      next.slides = next.slides.map((slide) =>
        slide.id === operation.slideId
          ? { ...slide, background: operation.background }
          : slide,
      );
    } else if (operation.op === "set_layout") {
      next.slides = next.slides.map((slide) =>
        slide.id === operation.slideId ? { ...slide, layout: operation.layout } : slide,
      );
    } else if (operation.op === "update_cta") {
      next.slides = next.slides.map((slide) => ({
        ...slide,
        elements: slide.elements.map((element) =>
          element.role === "cta" ? { ...element, text: operation.text } : element,
        ),
      }));
    } else if (operation.op === "update_text") {
      next.slides = next.slides.map((slide) =>
        slide.id === operation.slideId
          ? {
              ...slide,
              elements: slide.elements.map((element) =>
                element.id === operation.elementId
                  ? { ...element, text: operation.text }
                  : element,
              ),
            }
          : slide,
      );
    }
  }

  return carouselSchema.parse(next);
}
