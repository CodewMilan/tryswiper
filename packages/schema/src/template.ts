import { carouselSchema, type Carousel, type CarouselPlan } from "./carousel";

type TemplateIdFactory = (kind: "slide" | "element") => string;
export const TEMPLATE_COPY_ROLES = ["headline", "kicker", "body", "proof", "cta"] as const;

export function templateCopyFields(template: Carousel) {
  return template.slides.map((slide) => slide.elements.flatMap((element) => element.type === "text" && element.role && TEMPLATE_COPY_ROLES.includes(element.role as typeof TEMPLATE_COPY_ROLES[number]) ? [element.role] : []));
}

export function canGenerateTemplate(template: Carousel) {
  const fields = templateCopyFields(template);
  return fields.some((roles) => roles.length) && fields.every((roles) => new Set(roles).size === roles.length);
}

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
