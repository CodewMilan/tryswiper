import { NextResponse } from "next/server";

// Stream file downloads so exports can exceed a buffered function response.
export function fileBody(bytes: Uint8Array) {
  let offset = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.byteLength) {
        controller.close();
        return;
      }
      const end = Math.min(offset + 64 * 1024, bytes.byteLength);
      controller.enqueue(bytes.subarray(offset, end));
      offset = end;
    },
  });
}

export async function readBody(request: Request, limit = 1024 * 1024): Promise<Uint8Array> {
  const tooLarge = () => Object.assign(new Error("This request is too large."), { status: 413, code: "REQUEST_TOO_LARGE" });
  if (Number(request.headers.get("content-length")) > limit) throw tooLarge();
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.byteLength; if (size > limit) { await reader.cancel(); throw tooLarge(); } chunks.push(chunk.value); }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

export async function readJson(request: Request) { return JSON.parse(new TextDecoder().decode(await readBody(request))) as unknown; }

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>,
) {
  return NextResponse.json({ code, message, details }, { status });
}

export function fromUnknownError(error: unknown) {
  if (error instanceof SyntaxError) return apiError("INVALID_JSON", "Send a valid JSON request.", 400);
  if (error && typeof error === "object" && "status" in error && "message" in error) {
    const err = error as { status: number; message: string; code?: string; details?: Record<string, unknown> };
    return apiError(err.code ?? "ERROR", err.message, err.status, err.details);
  }
  const errorId = crypto.randomUUID();
  console.error(JSON.stringify({ event: "api_error", error_id: errorId, error_type: error instanceof Error ? error.name : "unknown" }));
  return apiError("INTERNAL", "Something went wrong", 500, { error_id: errorId });
}
