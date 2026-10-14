import { NextResponse } from "next/server";
import { E2E_COOKIE, e2eEnabled } from "@/lib/auth-env";

/** Test-only sign-out for the same account view used by Clerk. */
export async function POST(request: Request) {
  if (!e2eEnabled(request.headers.get("host"))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(E2E_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}
