"use client";

import { useClerk, useSignIn, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuthRuntime } from "@/components/auth-runtime";
import { AuthRecovery, authDestination } from "@/components/auth-recovery";

function go(url: string, router: ReturnType<typeof useRouter>) {
  if (url.startsWith("http")) window.location.assign(url);
  else router.replace(url);
}

export function SsoCallback() {
  const enabled = useAuthRuntime();
  return enabled ? <ClerkSsoCallback /> : <AuthRecovery />;
}

function ClerkSsoCallback() {
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const router = useRouter();
  const hasRun = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clerk.loaded || hasRun.current) return;
    hasRun.current = true;

    const destination = () => authDestination(true);

    const finish = async (
      resource: typeof signIn | typeof signUp,
    ) => {
      const { error: finalizeError } = await resource.finalize({
        navigate: async ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            router.replace("/login/continue");
            return;
          }
          go(decorateUrl(destination()), router);
        },
      });
      if (finalizeError) throw new Error(finalizeError.longMessage || finalizeError.message || "Could not activate your session. Try signing in again.");
    };

    void (async () => {
      if (signIn.status === "complete") {
        await finish(signIn);
        return;
      }

      if (signUp.isTransferable) {
        await signIn.create({ transfer: true });
        if ((signIn.status as string) === "complete") {
          await finish(signIn);
          return;
        }
        router.replace("/login");
        return;
      }

      if (signIn.isTransferable) {
        await signUp.create({ transfer: true });
        if ((signUp.status as string) === "complete") {
          await finish(signUp);
          return;
        }
        router.replace("/login/continue");
        return;
      }

      if (signUp.status === "complete") {
        await finish(signUp);
        return;
      }

      const existing = signIn.existingSession ?? signUp.existingSession;
      if (existing?.sessionId) {
        await clerk.setActive({
          session: existing.sessionId,
          navigate: async ({ session, decorateUrl }) => {
            if (session?.currentTask) {
              router.replace("/login/continue");
              return;
            }
            go(decorateUrl(destination()), router);
          },
        });
        return;
      }

      router.replace("/login");
    })().catch(() => setError("Your sign-in could not be completed. Please try again."));
  }, [clerk, router, signIn, signUp]);

  if (error) return <AuthRecovery message={error} />;
  return (
    <main id="main-content" className="hero-grid flex min-h-dvh items-center justify-center px-6">
      <p role="status" className="text-[15px] font-light text-ink-soft">Signing you in…</p>
      <div id="clerk-captcha" />
    </main>
  );
}
