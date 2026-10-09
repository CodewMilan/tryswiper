"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useSignIn } from "@clerk/nextjs";
import { GithubLogo, GoogleLogo } from "@phosphor-icons/react";
import { SiteNav } from "@/components/site-nav";
import { Magnetic } from "@/components/motion/magnetic";
import { FadeUp, SoftBlurIn } from "@/components/motion/soft-blur-in";
import { Button } from "@/components/ui/button";
import { safeNextPath } from "@/lib/paths";
import { useAuthRuntime } from "@/components/auth-runtime";

const providers = [
  { strategy: "oauth_google", label: "Continue with Google", icon: GoogleLogo },
  { strategy: "oauth_github", label: "Continue with GitHub", icon: GithubLogo },
] as const;

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? searchParams.get("redirect_url");
  const destination = safeNextPath(next);
  const [ready, setReady] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const configured = useAuthRuntime();
  const otherHref = mode === "signup" ? "/login" : "/signup";
  const otherWithNext = next ? `${otherHref}?next=${encodeURIComponent(next)}` : otherHref;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="hero-grid min-h-full">
      <SiteNav initialMode="guest" hideSignIn hideStartForFree />
      <main id="main-content" className="mx-auto flex min-h-full w-full max-w-[440px] flex-col justify-center px-4 pb-16 pt-28">
        <FadeUp show={ready}>
          <div className="rounded-[24px] border border-black/8 bg-white px-6 py-8 sm:px-8">
            <h1 className="text-[32px] font-light leading-tight tracking-[-0.03em] text-black">
              <SoftBlurIn
                segments={[{ text: mode === "signup" ? "Create your workspace" : "Sign in" }]}
              />
            </h1>
            <p className="mt-2 text-[15px] font-light leading-6 text-ink-soft">
              {mode === "signup"
                ? "Create from a brief in the browser, or connect the agent you already use."
                : "Open your carousel library and continue where you left off."}
            </p>
            <div className="mt-8 space-y-3">
              {configured ? (
                <SocialSignIn destination={destination} />
              ) : (
                <ProviderButtons
                  onClick={() =>
                    setConfigError(
                      "Sign-in is temporarily unavailable. Please try again later.",
                    )
                  }
                />
              )}
              {configError ? (
                <p className="text-sm text-destructive" role="alert">
                  {configError}
                </p>
              ) : null}
            </div>
            <p className="mt-6 text-sm font-light text-ink-soft">
              {mode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <Link
                    href={otherWithNext}
                    className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Sign in
                  </Link>
                </>
              ) : (
                <>
                  New here?{" "}
                  <Link
                    href={otherWithNext}
                    className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Create an account
                  </Link>
                </>
              )}
            </p>
          </div>
        </FadeUp>
      </main>
    </div>
  );
}

function ProviderButtons({
  pending,
  onClick,
}: {
  pending?: (typeof providers)[number]["strategy"] | null;
  onClick: (strategy: (typeof providers)[number]["strategy"]) => void;
}) {
  return providers.map((provider) => {
    const Icon = provider.icon;
    return (
      <Magnetic key={provider.strategy} strength={0.16} className="w-full">
        <Button className="w-full" disabled={pending !== undefined && pending !== null} onClick={() => onClick(provider.strategy)}>
          <Icon size={18} weight="bold" />
          {pending === provider.strategy ? "Redirecting…" : provider.label}
        </Button>
      </Magnetic>
    );
  });
}

function SocialSignIn({ destination }: { destination: string }) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { signIn } = useSignIn();
  const [pending, setPending] = useState<(typeof providers)[number]["strategy"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace(destination);
  }, [destination, isLoaded, isSignedIn, router]);

  async function start(strategy: (typeof providers)[number]["strategy"]) {
    if (pending || !isLoaded) return;
    setPending(strategy);
    setError(null);
    try {
      try { sessionStorage.setItem("swiper-next", destination); } catch { /* The provider also carries the redirect destination. */ }
      const { error: signInError } = await signIn.sso({ strategy, redirectUrl: destination, redirectCallbackUrl: "/sso-callback" });
      if (signInError) throw new Error(signInError.longMessage || signInError.message || "Could not sign in. Try again.");
    } catch (signInError) {
      setPending(null);
      setError(signInError instanceof Error ? signInError.message : "Could not sign in. Try again.");
    }
  }

  if (isLoaded && isSignedIn) return null;

  return (
    <>
      <ProviderButtons pending={pending} onClick={(strategy) => void start(strategy)} />
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
