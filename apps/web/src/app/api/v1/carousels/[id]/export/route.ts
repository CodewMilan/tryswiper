import { CANVAS_HEIGHT, CANVAS_WIDTH, carouselSchema } from "@swiper/schema";
import { renderExport } from "@swiper/rendering";
import { requireAuth } from "@/lib/api-auth";
import { appUrl, editorUrl } from "@/lib/utils";
import { apiError, fromUnknownError, json } from "@/lib/http";
import { assetsForWorkspace } from "@/server/assets";
import { getCarousel } from "@/server/carousels";
import { assertUsage, recordUsage, requireFeature, withUsageTransaction } from "@/server/usage";
import { withResourceBudget } from "@/server/resource-budget";

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
    const requestedFormat = url.searchParams.get("format") ?? "pdf";
    const format = requestedFormat === "jpeg" ? "jpg" : requestedFormat;
    if (format !== "png" && format !== "jpg" && format !== "pdf" && format !== "json") {
      return apiError("INVALID_FORMAT", "Format must be png, jpg, pdf, or json.");
    }

    const row = await getCarousel(authContext, id);
    const version = url.searchParams.get("version");
    if (version !== null && (!/^\d+$/.test(version) || Number(version) !== row.version)) return apiError("VERSION_CONFLICT", "This draft has changed. Review and prepare the current version before downloading its files.", 409);
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

    if (format === "jpg") await requireFeature(authContext.workspaceId, "jpg");
    await assertUsage(authContext.workspaceId, "export");

    const selectedSlides = slideIndex === undefined ? parsed.data.slides : [parsed.data.slides[slideIndex]!];
    const assetIds = selectedSlides.flatMap((slide) =>
      slide.elements.map((element) => element.assetId).filter((id): id is string => id != null),
    );
    const assets = assetIds.length
      ? await assetsForWorkspace(authContext.workspaceId, assetIds)
      : undefined;

    const rendered = await withResourceBudget(authContext.workspaceId, "render", () => renderExport(parsed.data, format, slideIndex, assets));
    const extension =
      (format === "png" || format === "jpg") && slideIndex != null ? format : rendered.extension;
    const name =
      (format === "png" || format === "jpg") && slideIndex != null
        ? fileName(row.title, format).replace(new RegExp(`\\.${format}$`), `-${String(slideIndex + 1).padStart(2, "0")}.${format}`)
        : fileName(row.title, extension);
    await withUsageTransaction(authContext.workspaceId, ["export"], async (tx) => { await recordUsage(authContext.workspaceId, "export", tx); });
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
        jpg: downloadUrl(id, "jpg"),
        json: downloadUrl(id, "json"),
      },
      formats: ["pdf", "png", "jpg", "json"],
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      note: "PDF is one page per slide. PNG and JPG are ZIPs of 1080×1350 images. Add ?slide=1 for one image.",
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
