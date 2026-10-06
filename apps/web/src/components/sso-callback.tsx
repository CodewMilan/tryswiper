"use client";

import { useClerk, useSignIn, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { safeNextPath } from "@/lib/paths";

function go(url: string, router: ReturnType<typeof useRouter>) {
  if (url.startsWith("http")) window.location.assign(url);
  else router.replace(url);
}

export function SsoCallback() {
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const router = useRouter();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!clerk.loaded || hasRun.current) return;
    hasRun.current = true;

    const destination = () => {
      const stored = sessionStorage.getItem("swiper-next");
      sessionStorage.removeItem("swiper-next");
      return safeNextPath(stored);
    };

    const finish = async (
      resource: typeof signIn | typeof signUp,
    ) => {
      await resource.finalize({
        navigate: async ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            router.replace("/login/continue");
            return;
          }
          go(decorateUrl(destination()), router);
        },
      });
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
    })();
  }, [clerk, router, signIn, signUp]);

  return (
    <div className="hero-grid flex min-h-full items-center justify-center px-6">
      <p className="text-[15px] font-light text-ink-soft">Signing you in…</p>
      <div id="clerk-captcha" />
    </div>
  );
}
