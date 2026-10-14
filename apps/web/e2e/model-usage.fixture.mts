import assert from "node:assert/strict";
import { planLocally } from "@swiper/ai";
import { carouselSchema } from "@swiper/schema";
import { db } from "../src/lib/db";
import { generateCarousel, generateSlide, getCarousel } from "../src/server/carousels";
import { usageFor } from "../src/server/usage";

const auth = { userId: process.argv[2]!, workspaceId: process.argv[3]!, source: "api_key" as const };
const previousFetch = globalThis.fetch;
const usage = async () => (await usageFor(auth.workspaceId)).generation ?? 0;
try {
  globalThis.fetch = async () => Response.json({ error: { message: "Invalid test key", type: "invalid_request_error", code: "invalid_api_key" } }, { status: 401 });
  const local = await generateCarousel({ auth, brief: "Explain why founders should write specific product stories from customer conversations." });
  assert.equal(local.source, "local");
  assert.equal(await usage(), 0);
  const revision = await generateSlide(auth, local.carousel_id, local.carousel.slides[0]!.id, "Make Customer stories make product copy specific");
  assert.equal(revision.source, "local");
  assert.ok(revision.warnings.some((warning) => warning.code === "LOCAL_GENERATION"));
  const persisted = carouselSchema.parse((await getCarousel(auth, local.carousel_id)).contentJson);
  assert.equal(persisted.metadata.generationSource, "local");
  assert.equal(await usage(), 0);

  const plan = planLocally({ brief: "Explain why founders should write specific product stories.", brand: { name: "Fieldnotes" } });
  globalThis.fetch = async (_url, init) => Response.json({
    id: "resp-test", object: "response", created_at: 1, model: "gpt-4.1", status: "completed",
    output: [{ id: "msg-test", type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify(String(init?.body).includes("Revise only slide") ? plan.slides[0] : plan), annotations: [] }] }],
    usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 },
  });
  const model = await generateCarousel({ auth, brief: "Explain why founders should write specific product stories." });
  assert.equal(model.source, "model");
  assert.equal(await usage(), 1);
  const revised = await generateSlide(auth, model.carousel_id, model.carousel.slides[0]!.id, "Shorten the headline");
  assert.equal(revised.source, "model");
  assert.equal(await usage(), 2);
} finally {
  globalThis.fetch = previousFetch;
  await db.$client.end();
}
