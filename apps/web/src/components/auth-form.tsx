"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        Swiper
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        {mode === "signup" ? "Create your workspace" : "Sign in"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "signup"
          ? "Then connect an agent. The web editor is there for review."
          : "Pick up where your agent left off."}
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
      <p className="mt-6 text-sm text-muted-foreground">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-foreground underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="font-medium text-foreground underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
