import { carouselPlanSchema, type CarouselPlan } from "@swiper/schema";
import { generateObject } from "ai";
import { compactBrand, type BrandContext } from "./brand";
import { planLocally } from "./local";

function model() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
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
  const loaded = await model();
  if (!loaded) return { plan: fallback, source: "local" };

  try {
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
}): Promise<CarouselPlan> {
  const current = input.plan.slides[input.slideIndex];
  if (!current) return input.plan;
  const loaded = await model();
  if (!loaded) {
    const local = planLocally({
      brief: `${current.headline}. ${input.instruction}`,
      formatId: input.plan.formatId,
      brand: input.brand,
    });
    const replacement = local.slides[input.slideIndex] ?? local.slides[0];
    if (!replacement) return input.plan;
    const slides = [...input.plan.slides];
    slides[input.slideIndex] = {
      ...current,
      headline: replacement.headline,
      body: replacement.body,
    };
    return { ...input.plan, slides };
  }

  try {
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
    return object;
  } catch {
    return input.plan;
  }
}
