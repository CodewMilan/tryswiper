import { carouselPlanSchema, slidePlanSchema, getFormat, formatSlides, clip, type CarouselPlan } from "@swiper/schema";
import { generateObject } from "ai";
import { compactBrand, type BrandContext } from "./brand";
import { planLocally } from "./local";

function firstUsefulLine(text: string, fallback: string) {
  const cleaned = text.replace(/^(make|change|rewrite|update)\s+/i, "").trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

export function generationModelConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.ANTHROPIC_API_KEY?.trim() || env.OPENAI_API_KEY?.trim());
}

function model() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (anthropicKey) {
    return import("@ai-sdk/anthropic").then(({ anthropic }) =>
      anthropic("claude-sonnet-4-5"),
    );
  }
  if (openaiKey) {
    return import("@ai-sdk/openai").then(({ openai }) => openai("gpt-4.1"));
  }
  return null;
}

const SYSTEM = `You write social carousel plans for Swiper.
Return a typed plan, not design coordinates.
Rules:
- One job per slide.
- Specific nouns and verbs. No hype.
- Never invent statistics, testimonials, customer counts, or awards.
- If a proof point is missing, write around it.
- The product should arrive as a consequence of the argument, not a jammed-in ad.
- Avoid: game-changing, revolutionary, unlock your potential, delve, generic three-part slogans.
- Headlines under 90 characters. Body under 220 characters.
- Match the requested format roles exactly.`;

export async function generatePlan(input: {
  brief: string;
  formatId?: string;
  slideCount?: number;
  brand: BrandContext;
  instruction?: string;
}): Promise<{ plan: CarouselPlan; source: "model" | "local" }> {
  const fallback = planLocally(input);
  try {
    const loaded = await model();
    if (!loaded) return { plan: fallback, source: "local" };
    const { object } = await generateObject({
      model: loaded,
      schema: carouselPlanSchema,
      abortSignal: AbortSignal.timeout(60000),
      maxRetries: 0,
      system: SYSTEM,
      prompt: [
        compactBrand(input.brand),
        input.formatId ? `Format id: ${input.formatId}` : "Pick the best official format.",
        input.slideCount ? `Return exactly ${input.slideCount} slides.` : "",
        input.formatId && getFormat(input.formatId) ? `Use these narrative roles in order: ${formatSlides(getFormat(input.formatId)!, input.slideCount).map((slide) => slide.role).join(", ")}` : "",
        `Brief: ${input.brief}`,
        input.instruction ? `Extra instruction: ${input.instruction}` : "",
        "Official formats include: problem-insight-product, five-things, before-after, myth-reality, step-by-step, product-teardown, founder-story, comparison, mistakes, curiosity-list, freeform.",
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
    if (!getFormat(object.formatId) || input.formatId && object.formatId !== input.formatId || input.slideCount && object.slides.length !== input.slideCount) return { plan: fallback, source: "local" };
    return { plan: object, source: "model" };
  } catch {
    return { plan: fallback, source: "local" };
  }
}

export async function reviseSlidePlan(input: {
  plan: CarouselPlan;
  slideIndex: number;
  instruction: string;
  brand: BrandContext;
}): Promise<{ plan: CarouselPlan; source: "model" | "local" }> {
  const current = input.plan.slides[input.slideIndex];
  if (!current) return { plan: input.plan, source: "local" };
  const fallback = (): CarouselPlan => {
    const lower = input.instruction.toLowerCase();
    const slides = [...input.plan.slides];
    if (/\bshort(er|en)?\b/.test(lower)) {
      slides[input.slideIndex] = {
        ...current,
        headline: clip(current.headline, 42),
        body: current.body ? clip(current.body, 90) : undefined,
      };
    } else if (/\bcta\b/.test(lower)) {
      const match = input.instruction.match(/to ["'](.+?)["']/i);
      slides[input.slideIndex] = {
        ...current,
        cta: match?.[1] ?? input.instruction.replace(/^.*cta[:\s]*/i, "").slice(0, 42),
      };
    } else {
      slides[input.slideIndex] = {
        ...current,
        headline: clip(firstUsefulLine(input.instruction, current.headline), 90),
      };
    }
    return { ...input.plan, slides };
  };

  try {
    const loaded = await model();
    if (!loaded) return { plan: fallback(), source: "local" };
    const { object } = await generateObject({
      model: loaded,
      schema: slidePlanSchema,
      abortSignal: AbortSignal.timeout(60000),
      maxRetries: 0,
      system: SYSTEM,
      prompt: [
        compactBrand(input.brand),
        `Revise only slide ${input.slideIndex + 1} (${current.role}).`,
        `Instruction: ${input.instruction}`,
        `Current plan JSON:\n${JSON.stringify(input.plan, null, 2)}`,
        "Return only the revised slide's copy. Preserve its role and layout. Include the existing copy fields unless the instruction changes them.",
      ].join("\n\n"),
    });
    const slides = [...input.plan.slides];
    slides[input.slideIndex] = { ...current, ...object, role: current.role, layout: current.layout };
    return { plan: { ...input.plan, slides }, source: "model" };
  } catch {
    return { plan: fallback(), source: "local" };
  }
}
