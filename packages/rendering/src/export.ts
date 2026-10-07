import { CANVAS_HEIGHT, CANVAS_WIDTH, type Carousel } from "@swiper/schema";
import { zipSync } from "fflate";
import { PDFDocument } from "pdf-lib";
import { decodeAssets, renderSlideJpegs, renderSlidePngs, type AssetMap, type DecodedAssets } from "./paint";

export type ExportFormat = "png" | "jpg" | "pdf" | "json";

export type ExportFile = {
  bytes: Uint8Array;
  contentType: string;
  extension: string;
};

function slideName(carousel: Carousel, index: number, extension = "png") {
  const role = carousel.slides[index]?.role ?? "slide";
  const slug = role
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${String(index + 1).padStart(2, "0")}-${slug || "slide"}.${extension}`;
}

export async function renderExport(
  carousel: Carousel,
  format: "png" | "jpg" | "pdf",
  slideIndex?: number,
  assets?: AssetMap,
): Promise<ExportFile> {
  const decoded: DecodedAssets | undefined = assets ? await decodeAssets(assets) : undefined;
  const pngs = renderSlidePngs(carousel, slideIndex, decoded);
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

  if (format === "jpg") {
    const jpgs = renderSlideJpegs(carousel, slideIndex, decoded);
    if (slideIndex != null) {
      const bytes = jpgs[0];
      if (!bytes) throw new Error("Slide render produced no image.");
      return { bytes, contentType: "image/jpeg", extension: "jpg" };
    }
    const files: Record<string, Uint8Array> = {};
    jpgs.forEach((jpg, index) => {
      files[slideName(carousel, index, "jpg")] = jpg;
    });
    return { bytes: zipSync(files, { level: 6 }), contentType: "application/zip", extension: "zip" };
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
