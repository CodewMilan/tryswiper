import { z } from "zod";
import {
  carouselSchema,
  elementSchema,
  slideSchema,
  type Carousel,
} from "./carousel";

export const carouselOperationSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("rename"), title: z.string().trim().min(1).max(120) }),
  z.object({
    op: z.literal("set_text_style"),
    slideId: z.string(),
    elementId: z.string(),
    style: elementSchema.shape.style.unwrap(),
  }),
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
  z.object({
    op: z.literal("set_element_box"),
    slideId: z.string(),
    elementId: z.string(),
    x: z.number(),
    y: z.number(),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  z.object({
    op: z.literal("set_element_image"),
    slideId: z.string(),
    elementId: z.string(),
    assetId: z.string().min(1),
    src: z.string().min(1),
  }),
  z.object({
    op: z.literal("add_element"),
    slideId: z.string(),
    element: elementSchema,
  }),
  z.object({
    op: z.literal("delete_element"),
    slideId: z.string(),
    elementId: z.string(),
  }),
]);

export type CarouselOperation = z.infer<typeof carouselOperationSchema>;

export function parseOperations(input: unknown): CarouselOperation[] | null {
  const result = z.array(carouselOperationSchema).safeParse(input);
  return result.success ? result.data : null;
}

function mapElement(
  carousel: Carousel,
  slideId: string,
  elementId: string,
  change: (element: Carousel["slides"][number]["elements"][number]) => Carousel["slides"][number]["elements"][number],
) {
  return carousel.slides.map((slide) =>
    slide.id === slideId
      ? {
          ...slide,
          elements: slide.elements.map((element) =>
            element.id === elementId ? change(element) : element,
          ),
        }
      : slide,
  );
}

export function applyOperations(
  carousel: Carousel,
  operations: CarouselOperation[],
): Carousel {
  let next: Carousel = JSON.parse(JSON.stringify(carousel)) as Carousel;

  for (const operation of operations) {
    if ("slideId" in operation && !next.slides.some((slide) => slide.id === operation.slideId)) {
      throw new Error("Slide no longer exists");
    }
    if ("elementId" in operation && !next.slides.find((slide) => slide.id === operation.slideId)?.elements.some((element) => element.id === operation.elementId)) {
      throw new Error("Element no longer exists");
    }
    if (operation.op === "rename") {
      next.metadata.title = operation.title;
    } else if (operation.op === "set_text_style") {
      next.slides = mapElement(next, operation.slideId, operation.elementId, (element) => ({ ...element, style: operation.style }));
    } else if (operation.op === "replace_slide_content") {
      next.slides = next.slides.map((slide) =>
        slide.id === operation.slideId ? { ...slide, elements: operation.elements } : slide,
      );
    } else if (operation.op === "insert_slide") {
      if (next.slides.length >= 12 || next.slides.some((slide) => slide.id === operation.slide.id)) throw new Error("Invalid new slide");
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
    } else if (operation.op === "set_element_box") {
      next.slides = mapElement(next, operation.slideId, operation.elementId, (element) => ({
        ...element,
        x: operation.x,
        y: operation.y,
        width: operation.width,
        height: operation.height,
      }));
    } else if (operation.op === "set_element_image") {
      next.slides = mapElement(next, operation.slideId, operation.elementId, (element) => ({
        ...element,
        type: "image",
        text: undefined,
        assetId: operation.assetId,
        src: operation.src,
      }));
    } else if (operation.op === "add_element") {
      if (next.slides.some((slide) => slide.elements.some((element) => element.id === operation.element.id))) throw new Error("Duplicate element");
      next.slides = next.slides.map((slide) =>
        slide.id === operation.slideId
          ? { ...slide, elements: [...slide.elements, operation.element] }
          : slide,
      );
    } else if (operation.op === "delete_element") {
      next.slides = next.slides.map((slide) =>
        slide.id === operation.slideId
          ? {
              ...slide,
              elements: slide.elements.filter((element) => element.id !== operation.elementId),
            }
          : slide,
      );
    }
  }

  return carouselSchema.parse(next);
}
