import { createMcpHandler } from "@modelcontextprotocol/server";
import { createSwiperServer } from "./server";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, accept, mcp-protocol-version, x-api-key",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
  "access-control-expose-headers": "mcp-session-id, www-authenticate",
};

function withCors(response: Response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(corsHeaders)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function unauthorized() {
  return withCors(
    new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32001,
          message:
            "Missing Swiper API key. Send Authorization: Bearer, or add ?key= to the MCP URL.",
        },
      }),
      {
        status: 401,
        headers: {
          "content-type": "application/json",
          "www-authenticate": 'Bearer realm="swiper"',
          "cache-control": "no-store",
        },
      },
    ),
  );
}

function readKey(request: Request) {
  const header = request.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    if (token) return token;
  }
  const apiKey = request.headers.get("x-api-key")?.trim();
  if (apiKey) return apiKey;
  return new URL(request.url).searchParams.get("key")?.trim() || null;
}

function withoutQueryKey(request: Request, key: string) {
  const url = new URL(request.url);
  if (!url.searchParams.has("key")) return request;
  url.searchParams.delete("key");
  const headers = new Headers(request.headers);
  if (!headers.get("authorization")) headers.set("authorization", `Bearer ${key}`);
  const init: RequestInit & { duplex?: "half" } = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }
  return new Request(url, init);
}

export function mcpOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function handleMcpRequest(request: Request) {
  const key = readKey(request);
  if (!key) return unauthorized();
  const cleaned = withoutQueryKey(request, key);
  const handler = createMcpHandler(() =>
    createSwiperServer({ key, base: new URL(cleaned.url).origin }),
  );
  return withCors(await handler.fetch(cleaned));
}
