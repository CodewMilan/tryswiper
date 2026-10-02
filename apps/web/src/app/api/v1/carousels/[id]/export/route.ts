import { CANVAS_HEIGHT, CANVAS_WIDTH, carouselSchema } from "@swiper/schema";
import { renderExport } from "@swiper/rendering";
import { requireAuth } from "@/lib/api-auth";
import { appUrl, editorUrl } from "@/lib/utils";
import { apiError, fromUnknownError, json } from "@/lib/http";
import { getCarousel } from "@/server/carousels";

export const runtime = "nodejs";

function fileName(title: string, extension: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${slug || "carousel"}.${extension}`;
}

function downloadUrl(id: string, format: string) {
  return `${appUrl().replace(/\/$/, "")}/api/v1/carousels/${id}/export?format=${format}`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await requireAuth(request);
    const { id } = await context.params;
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "pdf";
    if (format !== "png" && format !== "pdf" && format !== "json") {
      return apiError("INVALID_FORMAT", "Format must be png, pdf, or json.");
    }

    const row = await getCarousel(authContext, id);
    const parsed = carouselSchema.safeParse(row.contentJson);
    if (!parsed.success) {
      return apiError("INVALID_CAROUSEL", "This carousel cannot be rendered.", 422);
    }

    const slideParam = url.searchParams.get("slide");
    let slideIndex: number | undefined;
    if (slideParam != null && slideParam !== "") {
      const slideNumber = Number(slideParam);
      if (!Number.isInteger(slideNumber) || slideNumber < 1 || slideNumber > parsed.data.slides.length) {
        return apiError("INVALID_SLIDE", "That slide is not in this carousel.");
      }
      slideIndex = slideNumber - 1;
    }

    if (format === "json") {
      const bytes = Buffer.from(JSON.stringify(parsed.data, null, 2));
      return fileResponse(bytes, "application/json", fileName(row.title, "json"));
    }

    const rendered = await renderExport(parsed.data, format, slideIndex);
    const extension =
      format === "png" && slideIndex != null ? "png" : rendered.extension;
    const name =
      format === "png" && slideIndex != null
        ? fileName(row.title, "png").replace(/\.png$/, `-${String(slideIndex + 1).padStart(2, "0")}.png`)
        : fileName(row.title, extension);
    return fileResponse(rendered.bytes, rendered.contentType, name);
  } catch (error) {
    return fromUnknownError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await requireAuth(request);
    const { id } = await context.params;
    await getCarousel(authContext, id);
    return json({
      carousel_id: id,
      editor_url: editorUrl(id),
      download_url: downloadUrl(id, "pdf"),
      downloads: {
        pdf: downloadUrl(id, "pdf"),
        png: downloadUrl(id, "png"),
        json: downloadUrl(id, "json"),
      },
      formats: ["pdf", "png", "json"],
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      note: "PDF is one page per slide. PNG is a zip of 1080×1350 images. Add ?slide=1 for a single PNG.",
    });
  } catch (error) {
    return fromUnknownError(error);
  }
}

function fileResponse(bytes: Uint8Array, contentType: string, filename: string) {
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
