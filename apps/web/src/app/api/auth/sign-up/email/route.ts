import { NextResponse } from "next/server";
import { schema } from "@swiper/db";
import { E2E_COOKIE, e2eEnabled } from "@/lib/auth-env";
import { db } from "@/lib/db";
import { sid } from "@/lib/ids";
import { ensureWorkspace } from "@/lib/workspace";

/** Browser tests create a local user. Disabled unless SWIPER_E2E=1 on localhost. */
export async function POST(request: Request) {
  if (!e2eEnabled(request.headers.get("host"))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { name?: string; email?: string } | null;
  const name = body?.name?.trim();
  const email = body?.email?.trim().toLowerCase();
  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }

  const userId = sid("usr");
  await db.insert(schema.user).values({
    id: userId,
    name,
    email,
    emailVerified: true,
  });
  await ensureWorkspace(userId, name);

  const response = NextResponse.json({ ok: true, user: { id: userId, name, email } });
  response.cookies.set(E2E_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: false,
  });
  return response;
}
