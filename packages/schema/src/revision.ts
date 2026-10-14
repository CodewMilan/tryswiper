import type { Carousel, CarouselPlan, SlidePlan } from "./carousel";
import { carouselSchema } from "./carousel";
import { renderSlide } from "./render";

const COPY_ROLES = ["headline", "kicker", "body", "proof", "cta"] as const;

/** Read copy from the editable document, including reordered and manually added slides. */
export function planFromCarousel(carousel: Carousel, product: CarouselPlan["product"]): CarouselPlan {
  return {
    title: carousel.metadata.title,
    formatId: carousel.metadata.formatId,
    product,
    slides: carousel.slides.map((slide) => {
      const copy = Object.fromEntries(COPY_ROLES.map((role) => [role,
        slide.elements.find((element) => element.type === "text" && element.role === role)?.text,
      ]));
      return {
        ...copy,
        role: slide.role,
        layout: slide.layout,
        headline: copy.headline || slide.elements.find((element) => element.type === "text")?.text || slide.role,
      } as SlidePlan;
    }),
  };
}

/** Revise only text slots; existing IDs, geometry, styles, assets, and other slides stay intact. */
export function applySlideRevision(carousel: Carousel, slideId: string, revision: SlidePlan, newId: () => string): Carousel {
  const index = carousel.slides.findIndex((slide) => slide.id === slideId);
  if (index < 0) throw new Error("Slide no longer exists");
  const target = carousel.slides[index]!;
  const elements = target.elements.map((element) => ({ ...element }));
  const rendered = renderSlide({ ...revision, layout: target.layout, role: target.role }, carousel.theme, index);
  for (const role of COPY_ROLES) {
    const text = revision[role];
    if (text === undefined) continue;
    const existing = elements.find((element) => element.type === "text" && element.role === role);
    if (existing) existing.text = text;
    else {
      const slot = rendered.elements.find((element) => element.type === "text" && element.role === role);
      if (slot) elements.push({ ...slot, id: newId() });
    }
  }
  return carouselSchema.parse({
    ...carousel,
    slides: carousel.slides.map((slide) => slide.id === slideId ? { ...slide, elements } : slide),
  });
}
