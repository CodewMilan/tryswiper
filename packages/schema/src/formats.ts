import type { LayoutType } from "./carousel";

export type SlideRoleDef = {
  role: string;
  layout: LayoutType;
  job: string;
};

export type FormatDefinition = {
  id: string;
  name: string;
  description: string;
  slideCount: { min: number; max: number };
  slides: SlideRoleDef[];
};

export const FORMATS: FormatDefinition[] = [
  {
    id: "problem-insight-product",
    name: "Problem → Insight → Product",
    description:
      "Start with a painful problem, explain the insight, then introduce the product.",
    slideCount: { min: 6, max: 8 },
    slides: [
      { role: "hook", layout: "hero", job: "Give a reason to keep swiping." },
      { role: "problem", layout: "split", job: "Name the painful status quo." },
      { role: "insight", layout: "centered", job: "Reframe how to think about it." },
      { role: "proof", layout: "quote", job: "Show a concrete, owned proof point." },
      { role: "product", layout: "split", job: "Introduce the product as the consequence." },
      { role: "cta", layout: "cta", job: "One clear next step." },
    ],
  },
  {
    id: "five-things",
    name: "5 things nobody tells you",
    description: "A numbered list of sharp, specific observations that earn a product mention.",
    slideCount: { min: 7, max: 8 },
    slides: [
      { role: "hook", layout: "hero", job: "Promise five specific things." },
      { role: "item-1", layout: "list", job: "First observation." },
      { role: "item-2", layout: "list", job: "Second observation." },
      { role: "item-3", layout: "list", job: "Third observation." },
      { role: "item-4", layout: "list", job: "Fourth observation." },
      { role: "item-5", layout: "list", job: "Fifth observation." },
      { role: "cta", layout: "cta", job: "How the product helps you act on this." },
    ],
  },
  {
    id: "before-after",
    name: "Before → After",
    description: "Contrast the old way with the new way, then show the product.",
    slideCount: { min: 5, max: 7 },
    slides: [
      { role: "hook", layout: "hero", job: "Set up a before/after promise." },
      { role: "before", layout: "split", job: "The painful current workflow." },
      { role: "after", layout: "split", job: "The new workflow." },
      { role: "product", layout: "centered", job: "What changed." },
      { role: "cta", layout: "cta", job: "Invite them to try the after." },
    ],
  },
  {
    id: "myth-reality",
    name: "Myth → Reality",
    description: "Kill a common misconception, then explain what is actually true.",
    slideCount: { min: 6, max: 8 },
    slides: [
      { role: "hook", layout: "hero", job: "Name the myth people still believe." },
      { role: "myth", layout: "quote", job: "State the myth plainly." },
      { role: "reality", layout: "centered", job: "Replace it with the real mechanic." },
      { role: "why", layout: "split", job: "Why the myth stuck." },
      { role: "product", layout: "split", job: "How the product encodes the reality." },
      { role: "cta", layout: "cta", job: "Next step." },
    ],
  },
  {
    id: "step-by-step",
    name: "Step-by-step",
    description: "A tutorial-shaped carousel with a product-relevant method.",
    slideCount: { min: 6, max: 9 },
    slides: [
      { role: "hook", layout: "hero", job: "Promise a method with a clear outcome." },
      { role: "step-1", layout: "list", job: "First step." },
      { role: "step-2", layout: "list", job: "Second step." },
      { role: "step-3", layout: "list", job: "Third step." },
      { role: "step-4", layout: "list", job: "Fourth step." },
      { role: "cta", layout: "cta", job: "Do it with the product." },
    ],
  },
  {
    id: "product-teardown",
    name: "Product teardown",
    description: "Walk through how the product actually works, slide by slide.",
    slideCount: { min: 6, max: 8 },
    slides: [
      { role: "hook", layout: "hero", job: "Why this teardown is worth a swipe." },
      { role: "surface", layout: "split", job: "What people see first." },
      { role: "mechanic", layout: "split", job: "The core mechanic." },
      { role: "edge", layout: "list", job: "A non-obvious detail." },
      { role: "tradeoff", layout: "centered", job: "An honest limitation." },
      { role: "cta", layout: "cta", job: "Try it yourself." },
    ],
  },
  {
    id: "founder-story",
    name: "Founder story",
    description: "A specific origin story that lands on the product without a pitch deck tone.",
    slideCount: { min: 6, max: 8 },
    slides: [
      { role: "hook", layout: "hero", job: "A concrete scene, not a bio." },
      { role: "wound", layout: "split", job: "The personal problem." },
      { role: "attempt", layout: "split", job: "What you tried that failed." },
      { role: "turn", layout: "centered", job: "The insight that changed the work." },
      { role: "product", layout: "split", job: "What you built as a result." },
      { role: "cta", layout: "cta", job: "Invite the same kind of person." },
    ],
  },
  {
    id: "comparison",
    name: "Comparison",
    description: "A fair comparison against the default alternative, not a competitor smear.",
    slideCount: { min: 6, max: 7 },
    slides: [
      { role: "hook", layout: "hero", job: "Name the two paths." },
      { role: "old", layout: "comparison", job: "The default way." },
      { role: "new", layout: "comparison", job: "The other way." },
      { role: "difference", layout: "centered", job: "The actual difference that matters." },
      { role: "product", layout: "split", job: "Where the product sits." },
      { role: "cta", layout: "cta", job: "Pick a path." },
    ],
  },
  {
    id: "mistakes",
    name: "Mistakes",
    description: "Common mistakes in the category, then a better default.",
    slideCount: { min: 6, max: 8 },
    slides: [
      { role: "hook", layout: "hero", job: "How many people lose time here." },
      { role: "mistake-1", layout: "list", job: "First mistake." },
      { role: "mistake-2", layout: "list", job: "Second mistake." },
      { role: "mistake-3", layout: "list", job: "Third mistake." },
      { role: "fix", layout: "centered", job: "The better default." },
      { role: "cta", layout: "cta", job: "Product as the easier default." },
    ],
  },
  {
    id: "curiosity-list",
    name: "Curiosity list",
    description: "A list of specific, surprising facts that build toward a product-relevant conclusion.",
    slideCount: { min: 6, max: 8 },
    slides: [
      { role: "hook", layout: "hero", job: "A curiosity gap with a concrete subject." },
      { role: "item-1", layout: "list", job: "Surprising detail one." },
      { role: "item-2", layout: "list", job: "Surprising detail two." },
      { role: "item-3", layout: "list", job: "Surprising detail three." },
      { role: "item-4", layout: "list", job: "Surprising detail four." },
      { role: "cta", layout: "cta", job: "The conclusion and next step." },
    ],
  },
  {
    id: "freeform",
    name: "Start by hand",
    description: "Three slides with placeholder lines. A hook, one point, and a CTA.",
    slideCount: { min: 3, max: 8 },
    slides: [
      { role: "hook", layout: "hero", job: "Write the first line." },
      { role: "point", layout: "split", job: "Make the one point." },
      { role: "cta", layout: "cta", job: "Ask for the next step." },
    ],
  },
];

export function getFormat(id: string): FormatDefinition | undefined {
  return FORMATS.find((format) => format.id === id);
}

export function listFormats() {
  return FORMATS.map((format) => ({
    id: format.id,
    name: format.name,
    description: format.description,
    slideCount: format.slideCount,
    roles: format.slides.map((slide) => slide.role),
  }));
}

export function defaultFormatId() {
  return "problem-insight-product";
}
