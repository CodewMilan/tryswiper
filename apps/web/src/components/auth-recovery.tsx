"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { safeNextPath } from "@/lib/paths";
import { SiteNav } from "@/components/site-nav";

export function authDestination(consume = false) {
  try {
    const stored = sessionStorage.getItem("swiper-next");
    if (consume) sessionStorage.removeItem("swiper-next");
    return safeNextPath(stored);
  } catch { return "/library"; }
}

export function AuthRecovery({ message = "Sign-in is temporarily unavailable. Please try again." }: { message?: string }) {
  const [next, setNext] = useState("/library");
  useEffect(() => {
    const frame = requestAnimationFrame(() => setNext(authDestination()));
    return () => cancelAnimationFrame(frame);
  }, []);
  return <div className="hero-grid min-h-full"><SiteNav hideSignIn hideStartForFree /><main id="main-content" className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 pb-16 pt-28"><h1 className="text-3xl font-medium tracking-tight">We couldn’t finish signing you in</h1><p role="alert" className="mt-4 text-sm leading-6 text-destructive">{message}</p><Link href={`/login?next=${encodeURIComponent(next)}`} className="mt-6 inline-flex min-h-11 w-fit items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground">Return to sign in</Link></main></div>;
}
