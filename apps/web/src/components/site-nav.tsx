"use client";

import { useUser } from "@clerk/nextjs";
import { useAuthRuntime } from "@/components/auth-runtime";
import NavbarSectionTwo from "@/components/ui/navbar-section-2";

type Mode = "guest" | "member" | "pending";

export function SiteNav({ initialMode, hideSignIn = false, hideStartForFree = false }: { initialMode?: Mode; hideSignIn?: boolean; hideStartForFree?: boolean } = {}) {
  const authEnabled = useAuthRuntime();
  if (!authEnabled) {
    return <NavbarSectionTwo mode={initialMode ?? "guest"} hideSignIn={hideSignIn} hideStartForFree={hideStartForFree} />;
  }
  return <ClerkNav initialMode={initialMode} hideSignIn={hideSignIn} hideStartForFree={hideStartForFree} />;
}

function ClerkNav({ initialMode, hideSignIn, hideStartForFree }: { initialMode?: Mode; hideSignIn: boolean; hideStartForFree: boolean }) {
  const { isLoaded, isSignedIn } = useUser();
  const mode: Mode = !isLoaded ? (initialMode ?? "pending") : isSignedIn ? "member" : "guest";
  return <NavbarSectionTwo mode={mode} hideSignIn={hideSignIn} hideStartForFree={hideStartForFree} />;
}
