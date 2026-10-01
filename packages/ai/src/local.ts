import {
  defaultFormatId,
  FORMATS,
  getFormat,
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
    problem: brand.description ?? firstSentence(cleaned, "the current workflow is too slow"),
    differentiator: brand.positioning ?? firstSentence(cleaned, brand.name),
    proof: brand.proofPoints?.[0],
    cta: brand.cta ?? `Try ${brand.name}`,
    forbiddenClaims: brand.wordsToAvoid ?? [],
  };
}

function copyForRole(
  role: string,
  product: ProductContext,
  brief: string,
  index: number,
): { headline: string; body?: string; kicker?: string; proof?: string; cta?: string } {
  const name = product.name;
  const cleaned = cleanBrief(brief);
  const bits = sentences(cleaned);
  const bit = bits[Math.min(index, Math.max(bits.length - 1, 0))] ?? cleaned;
  const audience = product.audience ?? "the people you want to reach";

  switch (role) {
    case "hook":
      return {
        kicker: name.toUpperCase(),
        headline: firstSentence(cleaned, `Why ${name} does not start in a design tool`),
        body: `Written for ${audience}. Not a slogan — a working argument.`,
      };
    case "problem":
      return {
        headline: "The status quo still asks you to stitch tools together",
        body:
          product.problem ??
          "Copy in one place. Layout in another. Export somewhere else. The post never quite feels finished.",
      };
    case "insight":
      return {
        headline: "Agents can write. They still need a document they can edit.",
        body: product.differentiator ?? bit,
      };
    case "proof":
      return {
        headline: product.proof ?? "Keep claims you can actually stand behind.",
        body: "If a number is not in the brand kit, leave it off the slide.",
        proof: product.proof,
      };
    case "product":
      return {
        headline: `${name} is the layer between the agent and the post`,
        body: product.differentiator ?? bit,
      };
    case "cta":
      return {
        headline: "Make the next carousel from the agent you already use",
        body: product.differentiator,
        cta: product.cta,
      };
    case "before":
      return {
        headline: "Before: a pile of tabs and a half-designed post",
        body: product.problem ?? bit,
      };
    case "after":
      return {
        headline: `After: a typed carousel ${audience} can actually ship`,
        body: product.differentiator ?? bit,
      };
    case "myth":
      return {
        headline: "Myth: more copy is the bottleneck",
        body: "Most teams already have more words than they can design.",
      };
    case "reality":
      return {
        headline: "Reality: the missing object is the carousel itself",
        body: bit,
      };
    case "old":
      return {
        headline: "The default path",
        body: product.problem ?? "Chat, then Canva, then a zip of PNGs.",
      };
    case "new":
      return {
        headline: `The ${name} path`,
        body: product.differentiator ?? bit,
      };
    case "difference":
      return {
        headline: "The difference is the document, not the adjectives",
        body: product.differentiator ?? bit,
      };
    case "why":
      return {
        headline: "The myth stuck because the tools were separate",
        body: bit,
      };
    case "fix":
      return {
        headline: "A better default: one typed carousel",
        body: product.differentiator ?? bit,
      };
    case "wound":
      return {
        headline: "It started as a personal bottleneck, not a market slide",
        body: product.problem ?? bit,
      };
    case "attempt":
      return {
        headline: "The first workaround was still five tools",
        body: bit,
      };
    case "turn":
      return {
        headline: "The work changed when the carousel became a document",
        body: product.differentiator ?? bit,
      };
    case "surface":
      return {
        headline: "What people see first is the hook, not the settings panel",
        body: bit,
      };
    case "mechanic":
      return {
        headline: "Under the hook is a schema the agent can actually edit",
        body: product.differentiator ?? bit,
      };
    case "edge":
      return {
        headline: "A non-obvious detail: quality checks run before the link",
        body: bit,
      };
    case "tradeoff":
      return {
        headline: "It will not invent a layout from nothing every time",
        body: "Formats constrain the story so the output stays coherent.",
      };
    default: {
      if (role.startsWith("item-") || role.startsWith("step-") || role.startsWith("mistake-")) {
        return {
          kicker: role.replace("-", " ").toUpperCase(),
          headline: firstSentence(bit, `${name} ${role}`).slice(0, 80),
          body: product.differentiator ?? bit,
        };
      }
      return {
        headline: `${name}: ${role.replaceAll("-", " ")}`,
        body: product.differentiator ?? bit,
      };
    }
  }
}

export function planLocally(input: {
  brief: string;
  formatId?: string;
  brand: BrandContext;
}): CarouselPlan {
  const formatId = chooseFormatId(input.brief, input.formatId);
  const format = getFormat(formatId) ?? FORMATS[0]!;
  const product = productFrom(input.brief, input.brand);
  const cleaned = cleanBrief(input.brief);

  return {
    title: firstSentence(cleaned, `${product.name} carousel`).slice(0, 80),
    formatId: format.id,
    product,
    slides: format.slides.map((def, index) => {
      const copy = copyForRole(def.role, product, input.brief, index);
      return {
        role: def.role,
        layout: def.layout as LayoutType,
        ...copy,
      };
    }),
  };
}
