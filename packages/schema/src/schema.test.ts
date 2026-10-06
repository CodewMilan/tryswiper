import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_THEME } from "./carousel";
import { FORMATS } from "./formats";
import { applyOperations } from "./operations";
import { renderPlanToCarousel } from "./render";
import { planFromFormat } from "./scaffold";
import { instantiateCarouselTemplate, instantiateTemplatePlan } from "./template";
import { validateCarousel } from "./validate";
import type { CarouselPlan } from "./carousel";

const plan: CarouselPlan = {
  title: "Why Swiper is different",
  formatId: "problem-insight-product",
  product: {
    name: "Swiper",
    audience: "founders",
    problem: "AI copy still needs a designer",
    differentiator: "Agents write a typed carousel, not a blob of text",
    cta: "Connect Swiper MCP",
    forbiddenClaims: [],
  },
  slides: FORMATS[0]!.slides.map((def) => ({
    role: def.role,
    layout: def.layout,
    headline: `${def.role} headline for Swiper`,
    body: "Agents already write the copy. The missing piece is a structured carousel they can edit.",
    cta: def.role === "cta" ? "Connect Swiper MCP" : undefined,
  })),
};

test("renderPlanToCarousel produces a valid carousel", () => {
  const carousel = renderPlanToCarousel(plan, DEFAULT_THEME);
  const result = validateCarousel(carousel);
  assert.equal(result.ok, true, JSON.stringify(result.errors, null, 2));
  assert.equal(carousel.slides.length, plan.slides.length);
});

test("applyOperations can shorten a headline", () => {
  const carousel = renderPlanToCarousel(plan, DEFAULT_THEME);
  const first = carousel.slides[0]!;
  const headline = first.elements.find((el) => el.role === "headline")!;
  const next = applyOperations(carousel, [
    {
      op: "update_text",
      slideId: first.id,
      elementId: headline.id,
      text: "AI can write. It still cannot design the post.",
    },
  ]);
  assert.equal(
    next.slides[0]?.elements.find((el) => el.role === "headline")?.text,
    "AI can write. It still cannot design the post.",
  );
});

test("applyOperations moves, reorders, and swaps in an image", () => {
  const carousel = renderPlanToCarousel(plan, DEFAULT_THEME);
  const first = carousel.slides[0]!;
  const headline = first.elements.find((el) => el.role === "headline")!;
  const secondRole = carousel.slides[1]!.role;

  const next = applyOperations(carousel, [
    {
      op: "set_element_box",
      slideId: first.id,
      elementId: headline.id,
      x: 120,
      y: 240,
      width: 800,
      height: 360,
    },
    {
      op: "add_element",
      slideId: first.id,
      element: {
        id: "s1_img",
        type: "image",
        assetId: "ast_1",
        src: "/api/v1/assets/ast_1",
        x: 80,
        y: 760,
        width: 920,
        height: 460,
      },
    },
    { op: "reorder_slide", slideId: first.id, toIndex: 1 },
  ]);

  const moved = next.slides[1]!;
  assert.equal(moved.id, first.id);
  assert.equal(next.slides[0]?.role, secondRole);
  assert.deepEqual(
    { x: moved.elements[0]!.x, y: moved.elements[0]!.y },
    { x: 120, y: 240 },
  );
  assert.equal(moved.elements.at(-1)?.type, "image");

  const removed = applyOperations(next, [
    { op: "delete_element", slideId: moved.id, elementId: "s1_img" },
  ]);
  assert.equal(removed.slides[1]?.elements.some((el) => el.id === "s1_img"), false);
});

test("planFromFormat scaffolds every format into a valid carousel", () => {
  for (const format of FORMATS) {
    const plan = planFromFormat(format, { productName: "Swiper", cta: "Connect Swiper" });
    const carousel = renderPlanToCarousel(plan, DEFAULT_THEME);
    const result = validateCarousel(carousel);
    assert.equal(result.ok, true, `${format.id} ${JSON.stringify(result.errors)}`);
    assert.equal(carousel.slides.length, format.slides.length);
    assert.equal(carousel.slides.at(-1)?.layout, "cta");
  }
});

test("validator flags generic AI phrasing", () => {
  const carousel = renderPlanToCarousel(plan, DEFAULT_THEME);
  carousel.slides[0]!.elements[0]!.text = "A revolutionary game-changing platform";
  const result = validateCarousel(carousel);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((issue) => issue.code === "GENERIC_COPY"));
});

test("workspace formats create independent carousel and plan copies", () => {
  const carousel = renderPlanToCarousel(plan, DEFAULT_THEME);
  let nextId = 0;
  const copy = instantiateCarouselTemplate(carousel, {
    formatId: "fmt_workspace",
    title: "A fresh draft",
    newId: (kind) => `copy_${kind}_${++nextId}`,
  });
  const copiedPlan = instantiateTemplatePlan(plan, {
    formatId: "fmt_workspace",
    title: "A fresh draft",
  });

  assert.equal(copy.metadata.title, "A fresh draft");
  assert.equal(copy.metadata.formatId, "fmt_workspace");
  assert.equal(copiedPlan?.title, "A fresh draft");
  assert.equal(copiedPlan?.formatId, "fmt_workspace");
  assert.notEqual(copy.slides[0]?.id, carousel.slides[0]?.id);
  assert.notEqual(copy.slides[0]?.elements[0]?.id, carousel.slides[0]?.elements[0]?.id);
  assert.equal(validateCarousel(copy).warnings.some((issue) => issue.code === "UNKNOWN_FORMAT"), false);
});
