"use client";

import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeNextPath } from "@/lib/paths";

export default function ContinueSignUpPage() {
  const { signUp } = useSignUp();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const { error: updateError } = await signUp.update({
      firstName: String(form.get("firstName") ?? ""),
      lastName: String(form.get("lastName") ?? ""),
    });
    if (updateError) {
      setPending(false);
      setError(updateError.longMessage || updateError.message || "Could not finish sign-up.");
      return;
    }
    if (signUp.status !== "complete") {
      setPending(false);
      setError("A bit more is required before the workspace can open.");
      return;
    }
    await signUp.finalize({
      navigate: async ({ decorateUrl }) => {
        const stored = sessionStorage.getItem("swiper-next");
        const url = decorateUrl(safeNextPath(stored));
        if (url.startsWith("http")) window.location.assign(url);
        else router.replace(url);
      },
    });
  }

  return (
    <div className="hero-grid min-h-full">
      <SiteNav />
      <div className="mx-auto flex min-h-full w-full max-w-[440px] flex-col justify-center px-4 pb-16 pt-28">
        <div className="rounded-[24px] border border-black/8 bg-white px-6 py-8 sm:px-8">
          <h1 className="text-[32px] font-light leading-tight tracking-[-0.03em] text-black">
            One more step
          </h1>
          <p className="mt-2 text-[15px] font-light leading-6 text-ink-soft">
            Google or GitHub did not send a name. Add one to open the workspace.
          </p>
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" autoComplete="given-name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" autoComplete="family-name" required />
            </div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Working…" : "Continue"}
            </Button>
          </form>
          <div id="clerk-captcha" />
        </div>
      </div>
    </div>
  );
}
