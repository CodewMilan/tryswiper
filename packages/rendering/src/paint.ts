import { CANVAS_HEIGHT, CANVAS_WIDTH, type Carousel, type Slide, type Theme } from "@swiper/schema";
import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import { familyForWeight, registerFonts } from "./fonts";
import { wrapLines } from "./wrap";

type ContextWithSpacing = SKRSContext2D & { letterSpacing?: string };

function paintColor(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  if (/^#([0-9a-f]{3,8})$/i.test(value)) return value;
  if (/^(rgb|hsl)a?\(/i.test(value)) return value;
  return fallback;
}

function drawText(
  ctx: SKRSContext2D,
  element: Slide["elements"][number],
  theme: Theme,
) {
  const text = element.text ?? "";
  if (!text) return;
  const style = element.style;
  const fontSize = style?.fontSize ?? 24;
  const weight = style?.fontWeight ?? 500;
  const family = familyForWeight(weight);
  const color = paintColor(style?.color, theme.primary);
  const align = style?.align ?? "left";
  const lineHeight = fontSize * (style?.lineHeight ?? 1.2);
  const spacing = style?.letterSpacing ?? 0;

  ctx.save();
  ctx.beginPath();
  ctx.rect(element.x, element.y, element.width, element.height);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.font = `${fontSize}px "${family}"`;
  ctx.textBaseline = "top";
  const spaced = ctx as ContextWithSpacing;
  if (spacing) spaced.letterSpacing = `${spacing}px`;

  const lines = wrapLines(text, element.width, (value) => ctx.measureText(value).width);
  let y = element.y;
  for (const line of lines) {
    if (y + fontSize > element.y + element.height + 1) break;
    const width = ctx.measureText(line).width;
    let x = element.x;
    if (align === "center") x = element.x + (element.width - width) / 2;
    if (align === "right") x = element.x + element.width - width;
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  ctx.restore();
}

export function renderSlidePng(slide: Slide, theme: Theme): Buffer {
  registerFonts();
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = paintColor(slide.background.value, theme.background);
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  for (const element of slide.elements) {
    if (element.type === "text") {
      drawText(ctx, element, theme);
      continue;
    }
    if (element.type === "shape" || element.type === "line") {
      ctx.fillStyle = paintColor(element.style?.color, theme.accent);
      if (element.type === "line") {
        ctx.fillRect(element.x, element.y + element.height / 2, element.width, 2);
      } else {
        ctx.fillRect(element.x, element.y, element.width, element.height);
      }
    }
  }

  return canvas.toBuffer("image/png");
}

export function renderSlidePngs(carousel: Carousel, slideIndex?: number): Buffer[] {
  const slides =
    slideIndex == null ? carousel.slides : carousel.slides.slice(slideIndex, slideIndex + 1);
  return slides.map((slide) => renderSlidePng(slide, carousel.theme));
}
