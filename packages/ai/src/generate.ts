import { carouselPlanSchema, slidePlanSchema, getFormat, formatSlides, FORMATS, clip, type CarouselPlan } from "@swiper/schema";
import { generateObject } from "ai";
import { compactBrand, type BrandContext } from "./brand";
import { planLocally } from "./local";
import { z } from "zod";

function firstUsefulLine(text: string, fallback: string) {
  const cleaned = text.replace(/^(make|change|rewrite|update)\s+/i, "").trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

type GenerationProvider = "anthropic" | "openai" | "openrouter";

function activeProvider(env: NodeJS.ProcessEnv = process.env): GenerationProvider | null {
  if (env.ANTHROPIC_API_KEY?.trim()) return "anthropic";
  if (env.OPENAI_API_KEY?.trim()) return "openai";
  if (env.OPENROUTER_API_KEY?.trim()) return "openrouter";
  return null;
}

export function generationModelConfigured(env: NodeJS.ProcessEnv = process.env) {
  return activeProvider(env) !== null;
}

function model() {
  const provider = activeProvider();
  if (provider === "anthropic") {
    return import("@ai-sdk/anthropic").then(({ anthropic }) =>
      anthropic("claude-sonnet-4-5"),
    );
  }
  if (provider === "openai") {
    return import("@ai-sdk/openai").then(({ openai }) => openai("gpt-4.1"));
  }
  if (provider === "openrouter") {
    return import("@ai-sdk/openai").then(({ createOpenAI }) => {
      const openrouter = createOpenAI({
        name: "openrouter",
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY?.trim(),
        headers: {
          "HTTP-Referer": process.env.APP_URL?.trim() || "http://localhost:3100",
          "X-Title": "Swiper",
        },
      });
      // Chat completions, not the OpenAI Responses API. OpenRouter accepts this path.
      return openrouter.chat(process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4.1");
    });
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

function fallbackEvent(operation: "draft" | "revision", error: unknown, startedAt: number, requestRef?: string, usage?: { inputTokens?: number; outputTokens?: number }) {
  const value = error as { name?: string; statusCode?: number } | null;
  console.warn(JSON.stringify({ event: "generation_fallback", operation, duration_ms: Date.now() - startedAt,
    category: value?.name === "PromptBudgetError" ? "input_limit" : value?.name === "TimeoutError" || value?.name === "AbortError" ? "timeout" : /InvalidModelOutput|NoObjectGenerated/.test(value?.name ?? "") ? "invalid_output" : value?.statusCode === 401 || value?.statusCode === 403 ? "provider_auth" : value?.statusCode === 429 ? "provider_limit" : "provider_error", source: "local", request_ref: requestRef, input_tokens: usage?.inputTokens, output_tokens: usage?.outputTokens }));
}

/** Bound provider input as well as output; oversized context stays a free local draft. */
function boundedPrompt(prompt: string, schema: z.ZodType) {
  const bytes = new TextEncoder().encode(SYSTEM + prompt + JSON.stringify(z.toJSONSchema(schema))).byteLength;
  if (bytes > 32 * 1024) throw Object.assign(new Error("The supplied context exceeds the model input budget."), { name: "PromptBudgetError" });
  return prompt;
}

export async function generatePlan(input: {
  brief: string;
  formatId?: string;
  slideCount?: number;
  brand: BrandContext;
  instruction?: string;
  template?: CarouselPlan;
  requestRef?: string;
}): Promise<{ plan: CarouselPlan; source: "model" | "local" }> {
  const fallback = planLocally(input);
  const startedAt = Date.now();
  const invalidOutput = (usage: { inputTokens?: number; outputTokens?: number }) => { fallbackEvent("draft", { name: "InvalidModelOutput" }, startedAt, input.requestRef, usage); return { plan: fallback, source: "local" as const }; };
  try {
    const loaded = await model();
    if (!loaded) return { plan: fallback, source: "local" };
    const modelSchema = input.template ? carouselPlanSchema.extend({ slides: z.array(slidePlanSchema).length(input.template.slides.length) }) : carouselPlanSchema;
    const { object, usage } = await generateObject({
      model: loaded,
      schema: modelSchema,
      maxOutputTokens: 6000,
      abortSignal: AbortSignal.timeout(60000),
      maxRetries: 0,
      system: SYSTEM,
      prompt: boundedPrompt([
        compactBrand(input.brand),
        input.template ? `Saved workspace format: ${input.template.formatId}. Return exactly these roles and layouts in order, including all listed copy fields: ${JSON.stringify(input.template.slides.map((slide) => ({ role: slide.role, layout: slide.layout, copy_fields: ["headline", "kicker", "body", "proof", "cta"].filter((field) => slide[field as keyof typeof slide] !== undefined) })))}. Write NEW copy from the brief. Do not reuse the template's prior factual claims.` : "",
        input.formatId ? `Format id: ${input.formatId}` : "Pick the best official format.",
        input.slideCount ? `Return exactly ${input.slideCount} slides.` : "",
        input.formatId && getFormat(input.formatId) ? `Use these narrative roles in order: ${formatSlides(getFormat(input.formatId)!, input.slideCount).map((slide) => slide.role).join(", ")}` : "",
        `Brief: ${input.brief}`,
        input.instruction ? `Extra instruction: ${input.instruction}` : "",
        input.template ? "" : `Official formats and native roles: ${JSON.stringify(FORMATS.map((format) => ({ id: format.id, roles: format.slides.map((slide) => slide.role), count: format.slideCount })))}. For extra slides, add detail-1, detail-2, etc. immediately before proof/product/CTA.`,
      ]
        .filter(Boolean)
        .join("\n\n"), modelSchema),
    });
    if (input.template) {
      if (object.formatId !== input.template.formatId || object.slides.length !== input.template.slides.length || object.slides.some((slide, index) => slide.role !== input.template!.slides[index]!.role || slide.layout !== input.template!.slides[index]!.layout || (["kicker", "body", "proof", "cta"] as const).some((field) => input.template!.slides[index]![field] !== undefined && slide[field] === undefined))) return invalidOutput(usage);
    } else {
      const format = getFormat(object.formatId);
      if (!format || input.formatId && object.formatId !== input.formatId || input.slideCount && object.slides.length !== input.slideCount || object.slides.length < format.slideCount.min || object.slides.length > format.slideCount.max || object.slides.some((slide, index) => slide.role !== formatSlides(format, object.slides.length)[index]?.role)) return invalidOutput(usage);
    }
    console.info(JSON.stringify({ event: "generation_success", operation: "draft", provider: activeProvider(), duration_ms: Date.now() - startedAt, input_tokens: usage.inputTokens, output_tokens: usage.outputTokens, source: "model", request_ref: input.requestRef }));
    return { plan: object, source: "model" };
  } catch (error) {
    fallbackEvent("draft", error, startedAt, input.requestRef);
    return { plan: fallback, source: "local" };
  }
}

export async function reviseSlidePlan(input: {
  plan: CarouselPlan;
  slideIndex: number;
  instruction: string;
  brand: BrandContext;
  requestRef?: string;
}): Promise<{ plan: CarouselPlan; source: "model" | "local" }> {
  const current = input.plan.slides[input.slideIndex];
  const startedAt = Date.now();
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
    const { object, usage } = await generateObject({
      model: loaded,
      schema: slidePlanSchema,
      maxOutputTokens: 1200,
      abortSignal: AbortSignal.timeout(60000),
      maxRetries: 0,
      system: SYSTEM,
      prompt: boundedPrompt([
        compactBrand(input.brand),
        `Revise only slide ${input.slideIndex + 1} (${current.role}).`,
        `Instruction: ${input.instruction}`,
        `Current plan JSON:\n${JSON.stringify(input.plan, null, 2)}`,
        "Return only the revised slide's copy. Preserve its role and layout. Include the existing copy fields unless the instruction changes them.",
      ].join("\n\n"), slidePlanSchema),
    });
    const slides = [...input.plan.slides];
    slides[input.slideIndex] = { ...current, ...object, role: current.role, layout: current.layout };
    console.info(JSON.stringify({ event: "generation_success", operation: "revision", provider: activeProvider(), duration_ms: Date.now() - startedAt, input_tokens: usage.inputTokens, output_tokens: usage.outputTokens, source: "model", request_ref: input.requestRef }));
    return { plan: { ...input.plan, slides }, source: "model" };
  } catch (error) {
    fallbackEvent("revision", error, startedAt, input.requestRef);
    return { plan: fallback(), source: "local" };
  }
}
