import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { E2E_COOKIE, clerkConfigured, e2eEnabled, isE2eUserId } from "@/lib/auth-env";
import { safeNextPath } from "@/lib/paths";

const protectedPaths = ["/connect", "/brand", "/new", "/c"];
const guestPaths = ["/login", "/signup"];

function matches(pathname: string, paths: string[]) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function guard(request: NextRequest, signedIn: boolean) {
  const { pathname, search } = request.nextUrl;
  if (!signedIn && matches(pathname, protectedPaths)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }
  if (signedIn && matches(pathname, guestPaths)) {
    const next = request.nextUrl.searchParams.get("next") ?? request.nextUrl.searchParams.get("redirect_url");
    return NextResponse.redirect(new URL(safeNextPath(next), request.url));
  }
  return NextResponse.next();
}

const withClerk = clerkMiddleware(async (auth, request) => {
  const { isAuthenticated } = await auth();
  return guard(request, isAuthenticated);
});

export function proxy(request: NextRequest, event: NextFetchEvent) {
  if (e2eEnabled(request.headers.get("host"))) {
    const signedIn = isE2eUserId(request.cookies.get(E2E_COOKIE)?.value);
    if (!signedIn && matches(request.nextUrl.pathname, protectedPaths)) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }
  if (!clerkConfigured()) return guard(request, false);
  return withClerk(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
