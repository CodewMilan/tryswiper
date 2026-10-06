import { carouselSchema, type Carousel, type CarouselPlan } from "./carousel";

type TemplateIdFactory = (kind: "slide" | "element") => string;

/** Creates an independent draft from a saved workspace format. */
export function instantiateCarouselTemplate(
  template: Carousel,
  input: {
    formatId: string;
    title: string;
    newId: TemplateIdFactory;
  },
): Carousel {
  return carouselSchema.parse({
    ...template,
    metadata: {
      ...template.metadata,
      title: input.title,
      formatId: input.formatId,
    },
    slides: template.slides.map((slide) => ({
      ...slide,
      id: input.newId("slide"),
      elements: slide.elements.map((element) => ({
        ...element,
        id: input.newId("element"),
      })),
    })),
  });
}

export function instantiateTemplatePlan(
  template: CarouselPlan | null,
  input: { formatId: string; title: string },
): CarouselPlan | null {
  if (!template) return null;
  return {
    ...template,
    title: input.title,
    formatId: input.formatId,
    product: { ...template.product },
    slides: template.slides.map((slide) => ({ ...slide })),
  };
}
