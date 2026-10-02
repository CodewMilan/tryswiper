import { CANVAS_HEIGHT, CANVAS_WIDTH, type Carousel } from "@swiper/schema";
import { zipSync } from "fflate";
import { PDFDocument } from "pdf-lib";
import { renderSlidePngs } from "./paint";

export type ExportFormat = "png" | "pdf" | "json";

export type ExportFile = {
  bytes: Uint8Array;
  contentType: string;
  extension: string;
};

function slideName(carousel: Carousel, index: number) {
  const role = carousel.slides[index]?.role ?? "slide";
  const slug = role
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${String(index + 1).padStart(2, "0")}-${slug || "slide"}.png`;
}

export async function renderExport(
  carousel: Carousel,
  format: "png" | "pdf",
  slideIndex?: number,
): Promise<ExportFile> {
  const pngs = renderSlidePngs(carousel, slideIndex);
  if (format === "png" && slideIndex != null) {
    const bytes = pngs[0];
    if (!bytes) throw new Error("Slide render produced no image.");
    return { bytes, contentType: "image/png", extension: "png" };
  }
  if (format === "png") {
    const files: Record<string, Uint8Array> = {};
    pngs.forEach((png, index) => {
      files[slideName(carousel, index)] = png;
    });
    return {
      bytes: zipSync(files, { level: 6 }),
      contentType: "application/zip",
      extension: "zip",
    };
  }

  const pdf = await PDFDocument.create();
  pdf.setTitle(carousel.metadata.title);
  for (const png of pngs) {
    const image = await pdf.embedPng(png);
    const page = pdf.addPage([CANVAS_WIDTH, CANVAS_HEIGHT]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    });
  }
  return {
    bytes: await pdf.save(),
    contentType: "application/pdf",
    extension: "pdf",
  };
}

export { CANVAS_HEIGHT, CANVAS_WIDTH };
