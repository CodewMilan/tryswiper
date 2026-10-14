import {
  defaultFormatId,
  FORMATS,
  getFormat,
  formatSlides,
  type CarouselPlan,
  type LayoutType,
  type ProductContext,
} from "@swiper/schema";
import type { BrandContext } from "./brand";

function sentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function firstSentence(text: string, fallback: string) {
  return sentences(text)[0]?.replace(/[.?!]$/, "") ?? fallback;
}

function cleanBrief(brief: string) {
  return brief
    .replace(
      /^(please\s+)?(make|create|write|generate|build)\s+(a\s+|an\s+)?(social\s+)?carousel\s+(that\s+)?(explaining|explains|about|on|for)?\s*/i,
      "",
    )
    .replace(/^[.:,-]\s*/, "")
    .trim();
}

function chooseFormatId(brief: string, requested?: string) {
  if (requested && getFormat(requested)) return requested;
  const lower = brief.toLowerCase();
  if (/\b(myth|actually|isn't true)\b/.test(lower)) return "myth-reality";
  if (/\b(before|after)\b/.test(lower)) return "before-after";
  if (/\b(vs|versus|compared|different from)\b/.test(lower)) return "comparison";
  if (/\b(step|how to|tutorial)\b/.test(lower)) return "step-by-step";
  if (/\bmistake/.test(lower)) return "mistakes";
  if (/\b(founder|i built|we started)\b/.test(lower)) return "founder-story";
  if (/\bteardown\b/.test(lower)) return "product-teardown";
  if (/\b(nobody tells|5 things|five things)\b/.test(lower)) return "five-things";
  return defaultFormatId();
}

function productFrom(brief: string, brand: BrandContext): ProductContext {
  const cleaned = cleanBrief(brief);
  return {
    name: brand.name || "the product",
    audience: brand.audience ?? undefined,
    problem: brand.description ?? firstSentence(cleaned, ""),
    differentiator: brand.positioning ?? firstSentence(cleaned, brand.name),
    proof: brand.proofPoints?.[0],
    cta: brand.cta?.trim() || "Learn more",
    forbiddenClaims: brand.wordsToAvoid ?? [],
  };
}

function copyForRole(
  role: string,
  product: ProductContext,
  brief: string,
  index: number,
): { headline: string; body?: string; kicker?: string; proof?: string; cta?: string } {
  const bits = sentences(cleanBrief(brief));
  const topic = firstSentence(cleanBrief(brief), product.name).slice(0, 80);
  const labels: Record<string, string> = {
    problem: "The problem", insight: "A useful insight", proof: "Supporting evidence",
    product: "The solution", before: "Before the change", after: "After the change",
    myth: "A common misconception", reality: "What actually happens", old: "The current approach",
    new: "A different approach", difference: "The key difference", why: "Why this matters",
    fix: "A practical fix", wound: "Where the story started", attempt: "The first attempt",
    turn: "The turning point", surface: "A closer look", mechanic: "How it works",
    edge: "A useful detail", tradeoff: "The tradeoff",
  };
  if (role === "hook") return { headline: topic, body: bits[1], kicker: "DRAFT" };
  if (role === "cta") return { headline: "Your next step", cta: product.cta || "Learn more" };
  const label = labels[role] ?? role.replaceAll("-", " ");
  const supplied = bits[index];
  return {
    kicker: label.toUpperCase(),
    headline: supplied ? firstSentence(supplied, label).slice(0, 90) : label,
    body: supplied ? undefined : `Draft: add ${label.toLowerCase()} for ${topic}.`,
    ...(role === "proof" && product.proof?.trim() ? { body: undefined, proof: product.proof } : {}),
  };
}

export function planLocally(input: {
  brief: string;
  formatId?: string;
  slideCount?: number;
  brand: BrandContext;
  template?: CarouselPlan;
}): CarouselPlan {
  const formatId = chooseFormatId(input.brief, input.formatId);
  const format = getFormat(formatId) ?? FORMATS[0]!;
  const product = productFrom(input.brief, input.brand);
  const cleaned = cleanBrief(input.brief);

  return {
    title: firstSentence(cleaned, `${product.name} carousel`).slice(0, 80),
    formatId: input.template?.formatId ?? format.id,
    product,
    slides: (input.template?.slides ?? formatSlides(format, input.slideCount)).map((def, index) => {
      const copy = copyForRole(def.role, product, input.brief, index);
      if (input.template) for (const field of ["kicker", "body", "proof", "cta"] as const) {
        if (input.template.slides[index]?.[field] !== undefined && copy[field] === undefined) copy[field] = field === "cta" ? product.cta ?? "Learn more" : `Draft: add ${field} for ${firstSentence(cleaned, product.name)}.`;
      }
      return {
        role: def.role,
        layout: def.layout as LayoutType,
        ...copy,
      };
    }),
  };
}
