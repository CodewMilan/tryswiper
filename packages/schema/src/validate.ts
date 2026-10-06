import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./canvas";
import { carouselSchema, type Carousel, type CarouselPlan } from "./carousel";
import { getFormat } from "./formats";
import {
  clip,
  findForbiddenPhrases,
  looksLikeUnsupportedClaim,
  TEXT_LIMITS,
} from "./quality";
import { renderPlanToCarousel } from "./render";

export type Issue = {
  code: string;
  message: string;
  slideIndex?: number;
  suggestedAction?: string;
  severity: "error" | "warning";
};

export type ValidationResult = {
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
};

function collectText(carousel: Carousel) {
  return carousel.slides.flatMap((slide, slideIndex) =>
    slide.elements
      .filter((element) => element.text)
      .map((element) => ({
        slideIndex,
        role: element.role ?? "body",
        text: element.text ?? "",
      })),
  );
}

export function validateCarousel(
  carousel: Carousel,
  options?: { forbiddenWords?: string[]; allowedProof?: string[] },
): ValidationResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const parsed = carouselSchema.safeParse(carousel);
  if (!parsed.success) {
    errors.push({
      code: "INVALID_SCHEMA",
      message: parsed.error.issues[0]?.message ?? "Carousel failed schema validation.",
      suggestedAction: "regenerate_carousel",
      severity: "error",
    });
    return { ok: false, errors, warnings };
  }

  const format = getFormat(carousel.metadata.formatId);
  if (!format && !carousel.metadata.formatId.startsWith("fmt_")) {
    warnings.push({
      code: "UNKNOWN_FORMAT",
      message: `Format ${carousel.metadata.formatId} is not in the official library.`,
      severity: "warning",
    });
  }

  const headlines = new Set<string>();

  for (const [slideIndex, slide] of carousel.slides.entries()) {
    if (slide.elements.length === 0) {
      errors.push({
        code: "EMPTY_SLIDE",
        message: `Slide ${slideIndex + 1} has no elements.`,
        slideIndex,
        suggestedAction: "generate_slide",
        severity: "error",
      });
    }

    for (const element of slide.elements) {
      if (
        element.x < 0 ||
        element.y < 0 ||
        element.x + element.width > CANVAS_WIDTH + 1 ||
        element.y + element.height > CANVAS_HEIGHT + 1
      ) {
        errors.push({
          code: "OUT_OF_BOUNDS",
          message: `Element ${element.id} on slide ${slideIndex + 1} sits outside the canvas.`,
          slideIndex,
          suggestedAction: "rerender",
          severity: "error",
        });
      }

      const text = element.text?.trim() ?? "";
      if (!text) continue;

      const limit = TEXT_LIMITS[element.role ?? "body"] ?? 220;
      if (text.length > limit) {
        errors.push({
          code: "TEXT_DENSITY",
          message: `Slide ${slideIndex + 1} ${element.role ?? "text"} exceeds ${limit} characters.`,
          slideIndex,
          suggestedAction: "shorten_text",
          severity: "error",
        });
      }

      for (const phrase of findForbiddenPhrases(text)) {
        errors.push({
          code: "GENERIC_COPY",
          message: `Slide ${slideIndex + 1} uses generic AI phrasing (“${phrase}”).`,
          slideIndex,
          suggestedAction: "rewrite_slide",
          severity: "error",
        });
      }

      for (const word of options?.forbiddenWords ?? []) {
        if (word && text.toLowerCase().includes(word.toLowerCase())) {
          errors.push({
            code: "FORBIDDEN_PHRASE",
            message: `Slide ${slideIndex + 1} uses a brand-forbidden phrase (“${word}”).`,
            slideIndex,
            suggestedAction: "rewrite_slide",
            severity: "error",
          });
        }
      }

      if (looksLikeUnsupportedClaim(text)) {
        const allowed = options?.allowedProof ?? [];
        const permitted = allowed.some((item) =>
          text.toLowerCase().includes(item.toLowerCase()),
        );
        if (!permitted) {
          errors.push({
            code: "UNSUPPORTED_CLAIM",
            message: `Slide ${slideIndex + 1} looks like an invented statistic or social proof.`,
            slideIndex,
            suggestedAction: "remove_claim",
            severity: "error",
          });
        }
      }

      if (element.role === "headline") {
        const key = text.toLowerCase();
        if (headlines.has(key)) {
          warnings.push({
            code: "DUPLICATE_CONTENT",
            message: `Headline on slide ${slideIndex + 1} repeats an earlier slide.`,
            slideIndex,
            suggestedAction: "rewrite_slide",
            severity: "warning",
          });
        }
        headlines.add(key);
      }
    }
  }

  const firstHeadline = carousel.slides[0]?.elements.find((el) => el.role === "headline")?.text;
  if (!firstHeadline || firstHeadline.trim().length < 8) {
    errors.push({
      code: "WEAK_HOOK",
      message: "Slide 1 needs a stronger, more specific hook.",
      slideIndex: 0,
      suggestedAction: "rewrite_slide",
      severity: "error",
    });
  }

  const last = carousel.slides.at(-1);
  const hasCta = last?.elements.some((el) => el.role === "cta" && el.text?.trim());
  if (!hasCta) {
    warnings.push({
      code: "UNCLEAR_CTA",
      message: "The last slide has no call to action.",
      slideIndex: carousel.slides.length - 1,
      suggestedAction: "update_cta",
      severity: "warning",
    });
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function repairPlan(plan: CarouselPlan): CarouselPlan {
  return {
    ...plan,
    slides: plan.slides.map((slide) => ({
      ...slide,
      kicker: slide.kicker ? clip(slide.kicker, TEXT_LIMITS.kicker ?? 42) : undefined,
      headline: clip(slide.headline, TEXT_LIMITS.headline ?? 90),
      body: slide.body ? clip(slide.body, TEXT_LIMITS.body ?? 220) : undefined,
      proof: slide.proof ? clip(slide.proof, TEXT_LIMITS.proof ?? 160) : undefined,
      cta: slide.cta ? clip(slide.cta, TEXT_LIMITS.cta ?? 42) : undefined,
    })),
  };
}

export function validateAndRepair(
  plan: CarouselPlan,
  theme: Carousel["theme"],
  options?: { forbiddenWords?: string[]; allowedProof?: string[] },
) {
  const repaired = repairPlan(plan);
  const carousel = renderPlanToCarousel(repaired, theme);
  const validation = validateCarousel(carousel, options);
  return { plan: repaired, carousel, validation };
}
