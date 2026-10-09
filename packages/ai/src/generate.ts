import { carouselPlanSchema, clip, type CarouselPlan } from "@swiper/schema";
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
      system: SYSTEM,
      prompt: [
        compactBrand(input.brand),
        input.formatId ? `Format id: ${input.formatId}` : "Pick the best official format.",
        `Brief: ${input.brief}`,
        input.instruction ? `Extra instruction: ${input.instruction}` : "",
        "Official formats include: problem-insight-product, five-things, before-after, myth-reality, step-by-step, product-teardown, founder-story, comparison, mistakes, curiosity-list.",
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
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
  function fallback(): CarouselPlan {
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
  }

  try {
    const loaded = await model();
    if (!loaded) return { plan: fallback(), source: "local" };
    const { object } = await generateObject({
      model: loaded,
      schema: carouselPlanSchema,
      system: SYSTEM,
      prompt: [
        compactBrand(input.brand),
        `Revise only slide ${input.slideIndex + 1} (${current.role}).`,
        `Instruction: ${input.instruction}`,
        `Current plan JSON:\n${JSON.stringify(input.plan, null, 2)}`,
        "Keep every other slide unchanged.",
      ].join("\n\n"),
    });
    return { plan: object, source: "model" };
  } catch {
    return { plan: fallback(), source: "local" };
  }
}
