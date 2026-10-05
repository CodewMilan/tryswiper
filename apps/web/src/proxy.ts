import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/connect", "/brand", "/new", "/c"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuth = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  if (!needsAuth) return NextResponse.next();

  const hasSession = request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes("better-auth.session_token"));
  if (!hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/connect/:path*", "/brand/:path*", "/new/:path*", "/c/:path*", "/connect", "/brand", "/new"],
};
