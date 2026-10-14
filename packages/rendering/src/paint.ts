import { CANVAS_HEIGHT, CANVAS_WIDTH, type Carousel, type Issue, type Slide, type Theme } from "@swiper/schema";
import { createCanvas, loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import { familyForWeight, registerFonts } from "./fonts";
import { wrapLines } from "./wrap";

type ContextWithSpacing = SKRSContext2D & { letterSpacing?: string };

function textLayout(ctx: SKRSContext2D, element: Slide["elements"][number], theme: Theme) {
  const style = element.style;
  const fontSize = style?.fontSize ?? 24;
  const weight = style?.fontWeight ?? 500;
  const family = familyForWeight(weight, element.role === "headline" ? theme.fontFamily : (theme.bodyFontFamily ?? theme.fontFamily));
  ctx.font = `${family === "Lora" ? weight + " " : ""}${fontSize}px "${family}"`;
  (ctx as ContextWithSpacing).letterSpacing = `${style?.letterSpacing ?? 0}px`;
  return { fontSize, lineHeight: fontSize * (style?.lineHeight ?? 1.2), lines: wrapLines(element.text ?? "", element.width, (value) => ctx.measureText(value).width) };
}

/** Measure the same wrapping and clipping rules as the exported image. */
export function textFitIssues(carousel: Carousel): Issue[] {
  registerFonts();
  const ctx = createCanvas(1, 1).getContext("2d");
  const issues: Issue[] = [];
  for (const [slideIndex, slide] of carousel.slides.entries()) for (const element of slide.elements) {
    if (element.type !== "text" || !element.text?.trim()) continue;
    const { fontSize, lineHeight, lines } = textLayout(ctx, element, carousel.theme);
    if (fontSize + Math.max(0, lines.length - 1) * lineHeight > element.height + 1 || lines.some((line) => ctx.measureText(line).width > element.width + 1)) issues.push({ code: "TEXT_OVERFLOW", severity: "error", slideIndex,
      message: `Slide ${slideIndex + 1} ${element.role ?? "text"} is clipped in the export. Enlarge its box, reduce the font size, or shorten the copy.`, suggestedAction: "resize_or_shorten_text" });
    if (fontSize < 12) issues.push({ code: "SMALL_TEXT", severity: "warning", slideIndex, message: `Slide ${slideIndex + 1} has very small text. Check readability at phone size.`, suggestedAction: "increase_font_size" });
  }
  return issues;
}

/** Image bytes keyed by the element's assetId. */
export type AssetMap = Map<string, Uint8Array>;

/** Decoded images keyed by assetId. Skia only paints images decoded through loadImage. */
export type DecodedAssets = Map<string, Image>;

export async function decodeAssets(assets: AssetMap): Promise<DecodedAssets> {
  const decoded: DecodedAssets = new Map();
  for (const [assetId, bytes] of assets) {
    try {
      decoded.set(assetId, await loadImage(Buffer.from(bytes)));
    } catch {
      throw Object.assign(new Error(`Uploaded image ${assetId} cannot be decoded. Replace it before exporting.`), { status: 422, code: "UNREADABLE_ASSET" });
    }
  }
  return decoded;
}

export async function readImageSize(bytes: Uint8Array) {
  try {
    const image = await loadImage(Buffer.from(bytes));
    if (!image.width || !image.height) return null;
    return { width: image.width, height: image.height };
  } catch {
    return null;
  }
}

/** Fills the element box, cropping the overflow like CSS object-fit: cover. */
function drawImage(ctx: SKRSContext2D, element: Slide["elements"][number], image: Image) {
  if (!image.width || !image.height) return;

  const scale = (element.type === "logo" ? Math.min : Math.max)(element.width / image.width, element.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;

  ctx.save();
  ctx.beginPath();
  ctx.rect(element.x, element.y, element.width, element.height);
  ctx.clip();
  ctx.drawImage(
    image,
    element.x + (element.width - width) / 2,
    element.y + (element.height - height) / 2,
    width,
    height,
  );
  ctx.restore();
}

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
  const color = paintColor(style?.color, theme.primary);
  const align = style?.align ?? "left";

  ctx.save();
  ctx.beginPath();
  ctx.rect(element.x, element.y, element.width, element.height);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  const { fontSize, lineHeight, lines } = textLayout(ctx, element, theme);
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

function renderSlideCanvas(slide: Slide, theme: Theme, assets?: DecodedAssets) {
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
    const image = element.assetId ? assets?.get(element.assetId) : undefined;
    if ((element.type === "image" || element.type === "logo") && !image) {
      throw Object.assign(new Error("A referenced image is unavailable. Replace it before exporting."), { status: 422, code: "MISSING_ASSET" });
    }
    if (image) {
      drawImage(ctx, element, image);
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

  return canvas;
}

export function renderSlidePng(slide: Slide, theme: Theme, assets?: DecodedAssets): Buffer {
  return renderSlideCanvas(slide, theme, assets).toBuffer("image/png");
}

export function renderSlideJpeg(slide: Slide, theme: Theme, assets?: DecodedAssets): Buffer {
  return renderSlideCanvas(slide, theme, assets).toBuffer("image/jpeg", 90);
}

export function renderSlidePngs(
  carousel: Carousel,
  slideIndex?: number,
  assets?: DecodedAssets,
): Buffer[] {
  const slides =
    slideIndex == null ? carousel.slides : carousel.slides.slice(slideIndex, slideIndex + 1);
  return slides.map((slide) => renderSlidePng(slide, carousel.theme, assets));
}

export function renderSlideJpegs(
  carousel: Carousel,
  slideIndex?: number,
  assets?: DecodedAssets,
): Buffer[] {
  const slides =
    slideIndex == null ? carousel.slides : carousel.slides.slice(slideIndex, slideIndex + 1);
  return slides.map((slide) => renderSlideJpeg(slide, carousel.theme, assets));
}
