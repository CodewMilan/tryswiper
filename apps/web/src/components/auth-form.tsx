"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { FadeUp, SoftBlurIn } from "@/components/motion/soft-blur-in";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/connect";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result =
      mode === "signup"
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });
    setPending(false);
    if (result.error) {
      setError(result.error.message ?? "Could not authenticate.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="hero-grid min-h-full">
      <SiteNav />
      <div className="mx-auto flex min-h-full w-full max-w-[440px] flex-col justify-center px-4 pb-16 pt-28">
        <FadeUp show={ready}>
          <div className="rounded-[24px] border border-black/8 bg-white px-6 py-8 sm:px-8">
            <h1 className="text-[32px] font-light leading-tight tracking-[-0.03em] text-black">
              <SoftBlurIn
                segments={[
                  { text: mode === "signup" ? "Create your workspace" : "Sign in" },
                ]}
              />
            </h1>
            <p className="mt-2 text-[15px] font-light leading-6 text-ink-soft">
              {mode === "signup"
                ? "Then connect an agent. The editor is there when you want to change a line."
                : "Pick up the carousel your agent already started."}
            </p>
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              {mode === "signup" ? (
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </div>
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>
            <p className="mt-6 text-sm font-light text-ink-soft">
              {mode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    Sign in
                  </Link>
                </>
              ) : (
                <>
                  New here?{" "}
                  <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    Create an account
                  </Link>
                </>
              )}
            </p>
          </div>
        </FadeUp>
      </div>
    </div>
  );
}
