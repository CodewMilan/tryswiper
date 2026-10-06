import { NextResponse } from "next/server";

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
    const err = error as { status: number; message: string; code?: string };
    return apiError(err.code ?? "ERROR", err.message, err.status);
  }
  console.error(error);
  return apiError("INTERNAL", "Something went wrong", 500);
}
