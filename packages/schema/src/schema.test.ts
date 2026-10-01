import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_THEME } from "./carousel.ts";
import { FORMATS } from "./formats.ts";
import { applyOperations } from "./operations.ts";
import { renderPlanToCarousel } from "./render.ts";
import { validateCarousel } from "./validate.ts";
import type { CarouselPlan } from "./carousel.ts";

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

test("validator flags generic AI phrasing", () => {
  const carousel = renderPlanToCarousel(plan, DEFAULT_THEME);
  carousel.slides[0]!.elements[0]!.text = "A revolutionary game-changing platform";
  const result = validateCarousel(carousel);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((issue) => issue.code === "GENERIC_COPY"));
});
