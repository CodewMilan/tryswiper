import { test, expect } from "@playwright/test";
import { generatePlan, generationModelConfigured, planLocally, reviseSlidePlan } from "@swiper/ai";

const input = {
  brief: "Explain how customer stories help founders write specific product copy.",
  brand: { name: "Fieldnotes", description: "Turn customer conversations into product stories.", audience: "Founders" },
};

test("missing, rejected, and successful model calls report the actual generation source", async () => {
  const previous = { anthropic: process.env.ANTHROPIC_API_KEY, openai: process.env.OPENAI_API_KEY, fetch: globalThis.fetch };
  const plan = planLocally(input);
  const revision = { plan, slideIndex: 0, instruction: "Make Specific stories start with customer conversations", brand: input.brand };
  let calls = 0;
  try {
    process.env.ANTHROPIC_API_KEY = " ";
    process.env.OPENAI_API_KEY = " ";
    globalThis.fetch = async () => {
      calls++;
      return Response.json({ error: { message: "Invalid test key", type: "invalid_request_error", code: "invalid_api_key" } }, { status: 401 });
    };
    expect(generationModelConfigured()).toBe(false);
    expect((await generatePlan(input)).source).toBe("local");
    expect((await reviseSlidePlan(revision)).source).toBe("local");
    expect(calls).toBe(0);

    process.env.OPENAI_API_KEY = "sk_test_fallback_only";
    expect(generationModelConfigured()).toBe(true);
    expect((await generatePlan(input)).source).toBe("local");
    const fallback = await reviseSlidePlan(revision);
    expect(fallback.source).toBe("local");
    expect(fallback.plan.slides[0]!.headline).toBe("Specific stories start with customer conversations");
    expect(fallback.plan.slides.slice(1)).toEqual(plan.slides.slice(1));
    expect(calls).toBe(2);

    const modelPlan = { ...plan, title: "Copy produced by the model" };
    globalThis.fetch = async () => Response.json({
      id: "resp-test", object: "response", created_at: 1, model: "gpt-4.1", status: "completed",
      output: [{ id: "msg-test", type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify(modelPlan), annotations: [] }] }],
      usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 },
    });
    const generated = await generatePlan(input);
    expect(generated.source).toBe("model");
    expect(generated.plan.title).toBe(modelPlan.title);
    globalThis.fetch = async () => Response.json({
      id: "resp-test", object: "response", created_at: 1, model: "gpt-4.1", status: "completed",
      output: [{ id: "msg-test", type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify({ ...plan.slides[0], headline: "A specific model revision" }), annotations: [] }] }],
      usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 },
    });
    const revised = await reviseSlidePlan(revision);
    expect(revised.source).toBe("model");
    expect(revised.plan.title).toBe(plan.title);
    expect(revised.plan.slides[0]!.headline).toBe("A specific model revision");
    expect(revised.plan.slides.slice(1)).toEqual(plan.slides.slice(1));
  } finally {
    if (previous.anthropic === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = previous.anthropic;
    if (previous.openai === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous.openai;
    globalThis.fetch = previous.fetch;
  }
});
