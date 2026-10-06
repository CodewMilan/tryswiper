import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { SwiperApiError, swiperFetch, type SwiperCredentials } from "./api";

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
        proofPoints: z.array(z.string()).optional(),
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
      description:
        "Create a complete, editable social carousel from a brief. Reads brand context, picks a format unless one is supplied, writes slides, and runs quality checks. Returns an editor URL.",
      inputSchema: z.object({
        brief: z.string().describe("What the carousel should argue or explain"),
        title: z.string().optional(),
        format_id: z.string().optional(),
        slide_count: z.number().optional(),
      }),
    },
    async (input) => {
      try {
        return ok(
          await call("/api/v1/carousels/generate", {
            method: "POST",
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
      description: "Create a carousel from a brief. Prefer generate_carousel for a finished draft.",
      inputSchema: z.object({
        title: z.string().optional(),
        brief: z.string(),
        format_id: z.string().optional(),
        brand_id: z.string().optional(),
      }),
    },
    async (input) => {
      try {
        return ok(
          await call("/api/v1/carousels", {
            method: "POST",
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
      description:
        "Apply structured operations instead of rewriting the whole document. Use this for CTA changes, text edits, reorder, insert, and delete.",
      inputSchema: z.object({
        carousel_id: z.string(),
        operations: z.array(z.unknown()),
      }),
    },
    async ({ carousel_id, operations }) => {
      try {
        return ok(
          await call(`/api/v1/carousels/${carousel_id}`, {
            method: "PATCH",
            body: JSON.stringify({ operations }),
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
      description:
        "Regenerate a single slide while preserving the rest of the narrative. Use for requests like “make slide 1 shorter”.",
      inputSchema: z.object({
        carousel_id: z.string(),
        slide_id: z.string(),
        instruction: z.string(),
      }),
    },
    async ({ carousel_id, slide_id, instruction }) => {
      try {
        return ok(
          await call(
            `/api/v1/carousels/${carousel_id}/slides/${slide_id}/regenerate`,
            {
              method: "POST",
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
      description: "Return the editor/preview URL for a carousel.",
      inputSchema: z.object({
        carousel_id: z.string(),
      }),
    },
    async ({ carousel_id }) => {
      try {
        return ok(
          await call(`/api/v1/carousels/${carousel_id}/render`, {
            method: "POST",
          }),
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "swiper.export_carousel",
    {
      description:
        "Create downloadable output for a carousel. Returns URLs for a multi-page PDF and a zip of 1080×1350 PNGs. Fetch a URL with the same API key to download the file.",
      inputSchema: z.object({
        carousel_id: z.string(),
      }),
    },
    async ({ carousel_id }) => {
      try {
        return ok(
          await call(`/api/v1/carousels/${carousel_id}/export`, {
            method: "POST",
          }),
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  return server;
}
