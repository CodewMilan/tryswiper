import type { CarouselElement, Slide, Theme } from "@swiper/schema";

// Real slide documents, displayed by the same component as the editor.
export const FORMAT_EXAMPLE_THEME: Theme = {
  background: "var(--card)",
  primary: "var(--foreground)",
  secondary: "var(--muted-foreground)",
  accent: "var(--accent)",
  fontFamily: "Inter",
};

const ink = FORMAT_EXAMPLE_THEME.primary;
const accent = FORMAT_EXAMPLE_THEME.accent;
const muted = FORMAT_EXAMPLE_THEME.secondary;

function text(
  id: string, value: string, x: number, y: number, width: number,
  height: number, fontSize: number, color = ink, fontWeight = 600,
): CarouselElement {
  return {
    id, type: "text", role: "headline", text: value, x, y, width, height,
    style: { fontSize, fontWeight, align: "left", color, lineHeight: 1.08, letterSpacing: -2 },
  };
}

function shape(id: string, x: number, y: number, width: number, height: number, color: string): CarouselElement {
  return {
    id, type: "shape", x, y, width, height,
    style: { color, fontSize: 24, fontWeight: 400, align: "left" },
  };
}

function example(id: string, elements: CarouselElement[]): Slide {
  return {
    id, layout: "hero", role: "hook",
    background: { type: "solid", value: FORMAT_EXAMPLE_THEME.background },
    elements: [
      text("brand", "swiper", 88, 76, 640, 70, 42),
      text("page", "01", 892, 80, 110, 60, 40, muted, 400),
      ...elements,
      shape("footer-line", 88, 1210, 904, 3, "var(--border)"),
      text("footer", "A better way to tell your story", 88, 1250, 770, 56, 35, muted, 400),
      text("swipe", "→", 902, 1230, 90, 85, 65),
    ],
  };
}

const EXAMPLES: Record<string, Slide> = {
  "problem-insight-product": example("problem-insight-product", [
    text("title", "Great ideas.", 88, 260, 904, 165, 132),
    text("pain", "Empty drafts.", 88, 420, 904, 165, 132, accent),
    text("body", "The problem isn't your ideas.\nIt's getting them onto the page.", 88, 665, 904, 145, 52, muted, 400),
    shape("problem-block", 88, 930, 210, 170, "var(--secondary)"),
    text("problem", "Idea", 128, 987, 160, 65, 46),
    text("arrow", "→", 335, 967, 90, 100, 82, accent),
    shape("insight-block", 448, 930, 210, 170, "var(--secondary)"),
    text("insight", "Insight", 468, 987, 190, 65, 46),
    text("arrow-2", "→", 689, 967, 90, 100, 82, accent),
    shape("product-block", 800, 930, 192, 170, accent),
    text("product", "Post", 833, 987, 155, 65, 46),
  ]),
  "five-things": example("five-things", [
    text("number", "5", 65, 200, 470, 650, 620, accent, 800),
    text("title", "things nobody\ntells you about\ncreating content.", 470, 385, 530, 420, 78),
    shape("number-line", 88, 910, 904, 3, "var(--border)"),
    ...["01", "02", "03", "04", "05"].map((value, index) =>
      text(`item-${value}`, value, 88 + index * 184, 957, 160, 95, 66, index === 0 ? accent : muted)),
    text("body", "Less guesswork. More good posts.", 88, 1100, 904, 80, 45, muted, 400),
  ]),
  "before-after": example("before-after", [
    text("title", "Same idea.\nBetter process.", 88, 245, 904, 290, 120),
    shape("before-bg", 88, 680, 432, 410, "var(--secondary)"),
    shape("after-bg", 540, 680, 452, 410, "color-mix(in srgb, var(--accent) 12%, var(--card))"),
    text("before", "Before", 128, 733, 350, 75, 45, muted, 400),
    text("after", "After", 580, 733, 350, 75, 45, "var(--destructive)", 400),
    text("before-value", "12 tabs.\nStill stuck.", 128, 845, 350, 180, 74),
    text("after-value", "One brief.\nOne draft.", 580, 845, 380, 180, 74),
    text("body", "From scattered to ready to share.", 88, 1130, 904, 65, 44, muted, 400),
  ]),
  "myth-reality": example("myth-reality", [
    text("myth", "THE MYTH", 88, 270, 904, 70, 42, muted, 400),
    text("old", "Post more.", 88, 395, 904, 165, 142, muted),
    shape("strike", 80, 467, 920, 12, accent),
    text("reality", "THE REALITY", 88, 685, 904, 70, 42, "var(--destructive)", 400),
    text("new", "Say something\nworth saving.", 88, 800, 904, 300, 118),
  ]),
  "step-by-step": example("step-by-step", [
    text("title", "From blank page\nto published.", 88, 245, 904, 300, 112),
    ...["Pick one idea.", "Find the hook.", "Make it a story.", "Put it out there."].flatMap((value, index) => [
      shape(`step-bg-${index}`, 88, 660 + index * 120, 85, 85, index === 0 ? accent : "var(--secondary)"),
      text(`step-number-${index}`, String(index + 1), 114, 683 + index * 120, 70, 55, 40),
      text(`step-text-${index}`, value, 214, 675 + index * 120, 770, 85, 64),
    ]),
  ]),
  "product-teardown": example("product-teardown", [
    text("title", "Good design.\nWhat's underneath?", 88, 245, 904, 380, 112),
    ...["The surface", "The system", "The small details"].flatMap((value, index) => [
      shape(`layer-bg-${index}`, 88 + index * 36, 710 + index * 122, 904 - index * 72, 108,
        index === 2 ? "color-mix(in srgb, var(--accent) 12%, var(--card))" : "var(--secondary)"),
      text(`layer-${index}`, value, 124 + index * 36, 738 + index * 122, 690, 65, 49),
      text(`layer-number-${index}`, `0${index + 1}`, 850 - index * 36, 738 + index * 122, 105, 65, 42, muted, 400),
    ]),
  ]),
};

export function formatExample(id: string, hook: string): Slide {
  return EXAMPLES[id] ?? example(id, [text("title", hook, 88, 300, 904, 740, 100)]);
}
