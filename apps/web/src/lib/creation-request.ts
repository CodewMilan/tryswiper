import { createHash } from "node:crypto";

export type CreationRequest = { key: string; hash: string };

export function creationRequest(request: Request, body: unknown): CreationRequest | undefined {
  const key = request.headers.get("Idempotency-Key")?.trim();
  if (key === undefined) return undefined;
  if (!/^[a-zA-Z0-9._:-]{1,120}$/.test(key)) throw Object.assign(new Error("Provide a request ID using at most 120 letters, numbers, dots, dashes, or colons."), { status: 400, code: "INVALID_REQUEST_ID" });
  return { key, hash: createHash("sha256").update(JSON.stringify(body)).digest("hex") };
}
