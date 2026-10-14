import assert from "node:assert/strict";
import { planLocally } from "@swiper/ai";
import { db } from "../src/lib/db";
import { deleteCarousel, generateCarousel, generateSlide, getCarousel, undoCarousel, undoDepth, updateCarousel } from "../src/server/carousels";
import { usageFor } from "../src/server/usage";

const auth = { userId: process.argv[2]!, workspaceId: process.argv[3]!, source: "api_key" as const };
const previousFetch = globalThis.fetch;
const plan = planLocally({ brief: "Explain how customer research improves product decisions.", brand: { name: "Fieldnotes" } });
function response(object: unknown) {
  return Response.json({ id: "resp-test", object: "response", created_at: 1, model: "gpt-4.1", status: "completed",
    output: [{ id: "msg-test", type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify(object), annotations: [] }] }],
    usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 } });
}
function delayedRevision() {
  let begin!: () => void; let release!: () => void;
  const started = new Promise<void>((resolve) => { begin = resolve; });
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let calls = 0;
  globalThis.fetch = async () => {
    if (++calls === 1) { begin(); await gate; }
    return response({ ...plan.slides[0], headline: calls === 1 ? "The delayed revision" : "The winning revision" });
  };
  return { started, release };
}
try {
  globalThis.fetch = async () => response(plan);
  const draft = await generateCarousel({ auth, brief: "Explain how customer research improves product decisions." });
  const id = draft.carousel_id; const slide = draft.carousel.slides[0]!;
  const headline = slide.elements.find((element) => element.role === "headline")!;
  let gate = delayedRevision();
  const pending = generateSlide(auth, id, slide.id, "Shorten the headline").catch((error: unknown) => error);
  await gate.started;
  const saved = await updateCarousel(auth, id, [{ op: "update_text", slideId: slide.id, elementId: headline.id, text: "An approved change made while the model was working." }], 1, "concurrent-edit");
  const depth = await undoDepth(id); const credits = (await usageFor(auth.workspaceId)).generation;
  gate.release();
  assert.equal((await pending as { code: string }).code, "VERSION_CONFLICT");
  assert.equal((await getCarousel(auth, id)).version, saved.version);
  assert.equal((await getCarousel(auth, id)).lastMutationId, "concurrent-edit");
  assert.equal(await undoDepth(id), depth);
  assert.equal((await usageFor(auth.workspaceId)).generation, credits);

  gate = delayedRevision();
  const duringUndo = generateSlide(auth, id, slide.id, "Shorten the headline").catch((error: unknown) => error);
  await gate.started;
  const undone = await undoCarousel(auth, id, saved.version);
  gate.release();
  assert.equal((await duringUndo as { code: string }).code, "VERSION_CONFLICT");
  assert.deepEqual((await getCarousel(auth, id)).contentJson, undone.carousel);
  assert.equal(await undoDepth(id), 0);

  gate = delayedRevision();
  const first = generateSlide(auth, id, slide.id, "Shorten the headline").catch((error: unknown) => error);
  await gate.started;
  const winner = await generateSlide(auth, id, slide.id, "Rewrite the headline");
  gate.release();
  assert.equal((await first as { code: string }).code, "VERSION_CONFLICT");
  assert.equal((await getCarousel(auth, id)).version, winner.version);
  assert.deepEqual((await getCarousel(auth, id)).contentJson, winner.carousel);
  assert.equal(await undoDepth(id), 1);

  gate = delayedRevision();
  const deleted = generateSlide(auth, id, slide.id, "Shorten the headline").catch((error: unknown) => error);
  await gate.started;
  await deleteCarousel(auth, id);
  gate.release();
  assert.equal((await deleted as { code: string }).code, "NOT_FOUND");
  assert.equal(await undoDepth(id), 0);
  assert.equal((await usageFor(auth.workspaceId)).generation, Number(credits) + 1);
} finally { globalThis.fetch = previousFetch; await db.$client.end(); }
