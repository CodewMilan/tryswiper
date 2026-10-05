import type { CarouselPlan } from "./carousel";
import type { FormatDefinition } from "./formats";
import { clip, TEXT_LIMITS } from "./quality";

function roleLabel(role: string) {
  return role
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function planFromFormat(
  format: FormatDefinition,
  input: {
    title?: string;
    productName: string;
    audience?: string | null;
    cta?: string | null;
    forbiddenClaims?: string[];
  },
): CarouselPlan {
  const used = new Set<string>();
  const cta = clip(input.cta?.trim() || "Your next step", TEXT_LIMITS.cta ?? 42);

  return {
    title: input.title?.trim() || format.name,
    formatId: format.id,
    product: {
      name: input.productName,
      audience: input.audience?.trim() || undefined,
      cta,
      forbiddenClaims: input.forbiddenClaims ?? [],
    },
    slides: format.slides.map((slide) => {
      let headline = clip(slide.job, TEXT_LIMITS.headline ?? 90);
      if (headline.length < 8) {
        headline = clip(`${slide.job} on this slide`, TEXT_LIMITS.headline ?? 90);
      }
      if (used.has(headline.toLowerCase())) {
        headline = clip(`${slide.job} (${roleLabel(slide.role)})`, TEXT_LIMITS.headline ?? 90);
      }
      used.add(headline.toLowerCase());

      const isCta = slide.layout === "cta" || slide.role === "cta";
      return {
        role: slide.role,
        layout: slide.layout,
        kicker: clip(roleLabel(slide.role), TEXT_LIMITS.kicker ?? 42),
        headline,
        body: isCta ? undefined : "Replace this line.",
        cta: isCta ? cta : undefined,
      };
    }),
  };
}
