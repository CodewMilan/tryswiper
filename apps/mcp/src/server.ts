import { McpServer, ResourceTemplate } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { carouselOperationSchema } from "@swiper/schema";
import { SwiperApiError, swiperFetch, swiperResponse, type SwiperCredentials } from "./api";

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function fail(error: unknown) {
  if (error instanceof SwiperApiError) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            { code: error.code, message: error.message, details: error.details },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
  const message = error instanceof Error ? error.message : "Unknown MCP error";
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ code: "MCP_ERROR", message }, null, 2),
      },
    ],
    isError: true,
  };
}

export function createSwiperServer(credentials?: SwiperCredentials) {
  const call = <T>(path: string, init?: RequestInit) => swiperFetch<T>(path, init, credentials);
  const server = new McpServer({
    name: "swiper",
    version: "0.1.0",
  });

  server.registerTool(
    "swiper.get_brand",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      description: "Read the workspace brand kit the agent should stay consistent with.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        return ok(await call("/api/v1/brand"));
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "swiper.update_brand",
    {
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
      description:
        "Update the workspace brand kit. Use this when the user describes their product, tone, audience, CTA, colors, or fonts.",
      inputSchema: z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        audience: z.string().optional(),
        positioning: z.string().optional(),
        tone: z.string().optional(),
        cta: z.string().optional(),
        website: z.string().optional(),
        wordsToUse: z.array(z.string()).optional(),
        wordsToAvoid: z.array(z.string()).optional(),
        proofPoints: z.array(z.string().trim().min(1).max(1000)).max(100).optional(),
        guidelines: z.string().max(10000).optional(),
        logoAssetId: z.string().min(1).nullable().optional().describe("An asset ID returned by upload_asset; null removes the logo."),
        colors: z
          .object({
            background: z.string().optional(),
            primary: z.string().optional(),
            secondary: z.string().optional(),
            accent: z.string().optional(),
          })
          .optional(),
        fonts: z
          .object({
            heading: z.string().optional(),
            body: z.string().optional(),
          })
          .optional(),
      }),
    },
    async (input) => {
      try {
        return ok(
          await call("/api/v1/brand", {
            method: "PATCH",
            body: JSON.stringify(input),
          }),
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "swiper.list_formats",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      description: "List official Swiper carousel formats and their narrative roles.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        return ok(await call("/api/v1/formats"));
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "swiper.list_projects",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      description: "List projects and carousels in the authenticated workspace.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        return ok(await call("/api/v1/projects"));
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "swiper.generate_carousel",
    {
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
      description:
        "Create a complete, editable social carousel from a brief. Reads brand context, picks a format unless one is supplied, writes slides, and runs quality checks. Returns an editor URL.",
      inputSchema: z.object({
        brief: z.string().trim().min(12).max(10000).describe("What the carousel should argue or explain"),
        title: z.string().max(120).optional(),
        format_id: z.string().min(1).max(120).optional(),
        slide_count: z.number().int().min(3).max(12).optional().describe("Must be within the selected format's advertised slide range."),
        request_id: z.string().min(1).max(120).optional().describe("Reuse this ID when retrying the same creation request; use a new ID for a different brief."),
      }),
    },
    async (input) => {
      try {
        return ok(
          await call("/api/v1/carousels/generate", {
            method: "POST",
            ...(input.request_id ? { headers: { "Idempotency-Key": input.request_id } } : {}),
            body: JSON.stringify(input),
          }),
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "swiper.create_carousel",
    {
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
      description: "Create a carousel from a brief. Prefer generate_carousel for a finished draft.",
      inputSchema: z.object({
        title: z.string().optional(),
        brief: z.string().trim().min(12).max(10000).optional(),
        format_id: z.string().optional(),
        request_id: z.string().min(1).max(120).optional().describe("Reuse this ID when retrying the same creation request."),
      }),
    },
    async (input) => {
      try {
        return ok(
          await call("/api/v1/carousels", {
            method: "POST",
            ...(input.request_id ? { headers: { "Idempotency-Key": input.request_id } } : {}),
            body: JSON.stringify(input),
          }),
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "swiper.get_carousel",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      description: "Return the canonical carousel JSON, metadata, and editor URL.",
      inputSchema: z.object({
        carousel_id: z.string(),
      }),
    },
    async ({ carousel_id }) => {
      try {
        return ok(await call(`/api/v1/carousels/${carousel_id}`));
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "swiper.update_carousel",
    {
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
      description:
        "Apply structured operations instead of rewriting the whole document. Use this for CTA changes, text edits, reorder, insert, and delete.",
      inputSchema: z.object({
        carousel_id: z.string(),
        operations: z.array(carouselOperationSchema).min(1).max(500).describe("Structured edits. Coordinates use the 1080×1350 canvas; images reference uploaded asset IDs."),
        expected_version: z.number().int().positive().describe("Version from get_carousel; stale edits are rejected."),
        mutation_id: z.string().min(1).max(100).describe("Unique edit ID; reuse it for an immediate retry of the same edit."),
      }),
    },
    async ({ carousel_id, operations, expected_version, mutation_id }) => {
      try {
        return ok(
          await call(`/api/v1/carousels/${carousel_id}`, {
            method: "PATCH",
            body: JSON.stringify({ operations, expected_version, mutation_id }),
          }),
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "swiper.generate_slide",
    {
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
      description:
        "Regenerate a single slide while preserving the rest of the narrative. Use for requests like “make slide 1 shorter”.",
      inputSchema: z.object({
        carousel_id: z.string(),
        slide_id: z.string(),
        instruction: z.string().trim().min(1).max(2000),
        request_id: z.string().min(1).max(120).optional().describe("Reuse this ID when retrying the same slide revision."),
      }),
    },
    async ({ carousel_id, slide_id, instruction, request_id }) => {
      try {
        return ok(
          await call(
            `/api/v1/carousels/${carousel_id}/slides/${slide_id}/regenerate`,
            {
              method: "POST",
              ...(request_id ? { headers: { "Idempotency-Key": request_id } } : {}),
              body: JSON.stringify({ instruction }),
            },
          ),
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "swiper.validate_carousel",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      description: "Run structural and content quality checks on a carousel.",
      inputSchema: z.object({
        carousel_id: z.string(),
      }),
    },
    async ({ carousel_id }) => {
      try {
        return ok(
          await call(`/api/v1/carousels/${carousel_id}/validate`, {
            method: "POST",
          }),
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "swiper.render_preview",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      description: "Render a saved slide as model-visible PNG image content. Review the image and its copy before sharing.",
      inputSchema: z.object({
        carousel_id: z.string(),
        slide_number: z.number().int().min(1).max(12).default(1),
      }),
    },
    async ({ carousel_id, slide_number }) => {
      try {
        const response = await swiperResponse(`/api/v1/carousels/${encodeURIComponent(carousel_id)}/render?slide=${slide_number}`, undefined, credentials);
        return { content: [
          { type: "text" as const, text: JSON.stringify({ carousel_id, slide_number, version: Number(response.headers.get("X-Carousel-Version")) }) },
          { type: "image" as const, data: Buffer.from(await response.arrayBuffer()).toString("base64"), mimeType: "image/png" },
        ] };
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "swiper.export_carousel",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      description:
        "Create downloadable output for a carousel. Returns URLs for a multi-page PDF and a zip of 1080×1350 PNGs. Use the returned protected MCP resource URI to read file bytes without putting a key in a URL; resource reads consume an export allowance.",
      inputSchema: z.object({
        carousel_id: z.string(),
      }),
    },
    async ({ carousel_id }) => {
      try {
        const metadata = await call(`/api/v1/carousels/${carousel_id}/export`, { method: "POST" });
        const draft = await call<{ version: number }>(`/api/v1/carousels/${carousel_id}`);
        return ok({ ...(metadata as object), resources: ["pdf", "png", "jpg", "json"].map((format) => ({
          uri: `swiper://carousels/${encodeURIComponent(carousel_id)}/versions/${draft.version}/exports/${format}`,
          name: `${carousel_id}.${format === "png" || format === "jpg" ? "zip" : format}`,
        })), note: "Read a protected resource with this MCP connection. Binary file reads consume export allowance; JSON is unmetered. Clients differ in how they expose file downloads." });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool("swiper.upload_asset", {
    description: "Upload a PNG/JPEG/WebP image (up to 8 MiB) for a logo or slide. Returns an owned asset ID and URL; never supply remote image URLs to edits.",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    inputSchema: z.object({ mime_type: z.enum(["image/png", "image/jpeg", "image/webp"]),
      data_base64: z.string().min(4).max(11184812).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/).describe("Raw base64 bytes, without a data URL prefix.") }),
  }, async ({ mime_type, data_base64 }) => {
    try {
      const bytes = Buffer.from(data_base64, "base64");
      if (bytes.length > 8 * 1024 * 1024) throw new SwiperApiError("FILE_TOO_LARGE", "Images must be 8 MiB or smaller.");
      const form = new FormData();
      form.set("file", new Blob([new Uint8Array(bytes)], { type: mime_type }), "upload");
      return ok(await call("/api/v1/assets", { method: "POST", body: form }));
    } catch (error) { return fail(error); }
  });

  server.registerTool("swiper.save_format", {
    description: "Save this draft's design, images and semantic copy slots as a workspace format. New generations replace headline/kicker/body/proof/CTA; fixed labels and captions stay saved. Duplicate names return a conflict.",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    inputSchema: z.object({ carousel_id: z.string(), name: z.string().trim().min(2).max(80), description: z.string().max(240).optional() }),
  }, async (input) => {
    try { return ok(await call("/api/v1/formats", { method: "POST", body: JSON.stringify(input) })); } catch (error) { return fail(error); }
  });

  server.registerTool("swiper.undo_carousel", {
    description: "Restore the previous saved draft. Read the current version first. A repeated request with the old expected_version returns a conflict and never undoes twice.",
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    inputSchema: z.object({ carousel_id: z.string(), expected_version: z.number().int().positive() }),
  }, async ({ carousel_id, expected_version }) => {
    try { return ok(await call(`/api/v1/carousels/${encodeURIComponent(carousel_id)}/undo`, { method: "POST", body: JSON.stringify({ expected_version }) })); } catch (error) { return fail(error); }
  });

  server.registerTool("swiper.delete_carousel", {
    description: "Permanently delete a carousel and its undo history. Saved formats remain. Only do this when the user asks; read the current version before deleting. Repeated deletion returns not found.",
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    inputSchema: z.object({ carousel_id: z.string(), expected_version: z.number().int().positive() }),
  }, async ({ carousel_id, expected_version }) => {
    try { return ok(await call(`/api/v1/carousels/${encodeURIComponent(carousel_id)}?expected_version=${expected_version}`, { method: "DELETE" })); } catch (error) { return fail(error); }
  });

  server.registerTool("swiper.get_request_status", {
    description: "Recover a committed creation or slide-revision result after a timeout or disconnected call. A not_completed result can still be in flight; retry with the same request_id and unchanged input.",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    inputSchema: z.object({ request_id: z.string().min(1).max(120) }),
  }, async ({ request_id }) => {
    try { return ok(await call(`/api/v1/requests/${encodeURIComponent(request_id)}`)); } catch (error) { return fail(error); }
  });

  server.registerResource("carousel-export", new ResourceTemplate("swiper://carousels/{carousel_id}/versions/{version}/exports/{format}", { list: undefined }),
    { description: "Authenticated version-bound export bytes; PNG/JPG bundles are ZIP files. Reads consume export allowance (except JSON)." },
    async (uri, variables) => {
      const carouselId = String(variables.carousel_id);
      const version = String(variables.version);
      const format = String(variables.format);
      if (!/^[A-Za-z0-9_-]+$/.test(carouselId) || !/^\d+$/.test(version) || !["pdf", "png", "jpg", "json"].includes(format)) throw new Error("Invalid export resource.");
      const response = await swiperResponse(`/api/v1/carousels/${carouselId}/export?format=${format}&version=${version}`, undefined, credentials);
      const blob = Buffer.from(await response.arrayBuffer()).toString("base64");
      return { contents: [{ uri: uri.href, mimeType: response.headers.get("Content-Type") ?? "application/octet-stream", blob }] };
    });

  return server;
}
