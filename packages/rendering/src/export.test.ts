import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_THEME, FORMATS, renderPlanToCarousel, type CarouselPlan } from "@swiper/schema";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { PDFDocument } from "pdf-lib";
import { unzipSync } from "fflate";
import { renderExport } from "./export";
import { wrapLines } from "./wrap";
import { renderSlidePng } from "./paint";

const plan: CarouselPlan = {
  title: "Why Swiper is different",
  formatId: "problem-insight-product",
  product: {
    name: "Swiper",
    audience: "founders",
    problem: "AI copy still needs a designer",
    differentiator: "Agents write a typed carousel",
    cta: "Connect Swiper",
    forbiddenClaims: [],
  },
  slides: FORMATS[0]!.slides.map((def) => ({
    role: def.role,
    layout: def.layout,
    headline: `${def.role} headline that is long enough to wrap onto a second line on the canvas`,
    body: "Agents already write the copy. The missing piece is a structured carousel they can edit and export.",
    cta: def.role === "cta" ? "Connect Swiper" : undefined,
  })),
};

function pngSize(bytes: Uint8Array) {
  assert.equal(bytes[0], 0x89);
  assert.equal(String.fromCharCode(...bytes.subarray(1, 4)), "PNG");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

test("wrapLines breaks text that does not fit", () => {
  const lines = wrapLines("one two three four", 8, (value) => value.length);
  assert.deepEqual(lines, ["one two", "three", "four"]);
});

test("png export is a zip of 1080×1350 slides", async () => {
  const carousel = renderPlanToCarousel(plan, DEFAULT_THEME);
  const file = await renderExport(carousel, "png");
  assert.equal(file.contentType, "application/zip");
  const entries = unzipSync(file.bytes);
  const names = Object.keys(entries).sort();
  assert.equal(names.length, carousel.slides.length);
  const first = entries[names[0]!];
  assert.ok(first);
  assert.deepEqual(pngSize(first), { width: 1080, height: 1350 });
});

test("pdf export has one page per slide", async () => {
  const carousel = renderPlanToCarousel(plan, DEFAULT_THEME);
  const file = await renderExport(carousel, "pdf");
  assert.equal(file.contentType, "application/pdf");
  assert.equal(String.fromCharCode(...file.bytes.subarray(0, 4)), "%PDF");
  const pdf = await PDFDocument.load(file.bytes);
  assert.equal(pdf.getPageCount(), carousel.slides.length);
  const page = pdf.getPage(0);
  assert.equal(page.getWidth(), 1080);
  assert.equal(page.getHeight(), 1350);
});

test("a single slide exports as png", async () => {
  const carousel = renderPlanToCarousel(plan, DEFAULT_THEME);
  const file = await renderExport(carousel, "png", 1);
  assert.equal(file.extension, "png");
  assert.deepEqual(pngSize(file.bytes), { width: 1080, height: 1350 });
});

test("jpg export is a zip of 1080×1350 slides", async () => {
  const carousel = renderPlanToCarousel(plan, DEFAULT_THEME);
  const file = await renderExport(carousel, "jpg");
  assert.equal(file.contentType, "application/zip");
  const entries = unzipSync(file.bytes);
  const names = Object.keys(entries).sort();
  assert.equal(names.length, carousel.slides.length);
  assert.ok(names[0]?.endsWith(".jpg"));
  const first = entries[names[0]!];
  assert.ok(first);
  assert.equal(first[0], 0xff);
  assert.equal(first[1], 0xd8);
  const image = await loadImage(Buffer.from(first));
  assert.deepEqual({ width: image.width, height: image.height }, { width: 1080, height: 1350 });
});

test("an uploaded image is painted into the slide", async () => {
  const source = createCanvas(4, 4);
  const sourceCtx = source.getContext("2d");
  sourceCtx.fillStyle = "#ff0000";
  sourceCtx.fillRect(0, 0, 4, 4);

  const carousel = renderPlanToCarousel(plan, DEFAULT_THEME);
  const slide = carousel.slides[0]!;
  slide.elements.push({
    id: "img_1",
    type: "image",
    assetId: "ast_1",
    src: "/api/v1/assets/ast_1",
    x: 100,
    y: 900,
    width: 400,
    height: 300,
  });

  const file = await renderExport(
    carousel,
    "png",
    0,
    new Map([["ast_1", source.toBuffer("image/png")]]),
  );
  const rendered = await loadImage(Buffer.from(file.bytes));
  const check = createCanvas(1080, 1350);
  const checkCtx = check.getContext("2d");
  checkCtx.drawImage(rendered, 0, 0);
  const [r, g, b] = checkCtx.getImageData(300, 1050, 1, 1).data;
  assert.deepEqual([r, g, b], [255, 0, 0]);
});

test("heading and body font choices change the rendered pixels", () => {
  const carousel = renderPlanToCarousel(plan, DEFAULT_THEME);
  const inter = renderSlidePng(carousel.slides[0]!, DEFAULT_THEME);
  const serif = renderSlidePng(carousel.slides[0]!, { ...DEFAULT_THEME, fontFamily: "Lora" });
  const mono = renderSlidePng(carousel.slides[0]!, { ...DEFAULT_THEME, bodyFontFamily: "IBM Plex Mono" });
  assert.notDeepEqual(inter, serif);
  assert.notDeepEqual(inter, mono);
});

test("a logo fits inside its box without cropping", async () => {
  const source = createCanvas(100, 50);
  const ctx = source.getContext("2d");
  ctx.fillStyle = "#ff0000"; ctx.fillRect(0, 0, 100, 50);
  const carousel = renderPlanToCarousel(plan, DEFAULT_THEME);
  carousel.slides[0]!.elements = [{ id: "logo", type: "logo", assetId: "logo", x: 100, y: 100, width: 100, height: 100 }];
  const output = await renderExport(carousel, "png", 0, new Map([["logo", source.toBuffer("image/png")]]));
  const image = await loadImage(Buffer.from(output.bytes));
  const sample = createCanvas(1080, 1350).getContext("2d");
  sample.drawImage(image, 0, 0);
  assert.deepEqual([...sample.getImageData(150, 150, 1, 1).data].slice(0, 3), [255, 0, 0]);
  assert.deepEqual([...sample.getImageData(150, 110, 1, 1).data].slice(0, 3), [250, 250, 248]);
});
