"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageIntro, Settle } from "@/components/page-intro";
import { Button } from "@/components/ui/button";

type Plan = "free" | "pro";
type Usage = Partial<Record<"carousel" | "generation" | "export" | "publish", number>>;
type Limits = Record<"carousel" | "generation" | "export" | "publish", number> & { jpg: boolean };

async function readPlan() {
  const response = await fetch("/api/v1/billing");
  if (response.status === 401) return { signedIn: false, plan: "free" as Plan, usage: {} as Usage, limits: null as Limits | null, error: null };
  const body = (await response.json()) as { plan?: Plan; usage?: Usage; limits?: Limits; message?: string };
  if (!response.ok) {
    return { signedIn: false, plan: "free" as Plan, usage: {} as Usage, limits: null as Limits | null, error: body.message ?? "Could not load the plan." };
  }
  return { signedIn: true, plan: (body.plan === "pro" ? "pro" : "free") as Plan, usage: body.usage ?? {}, limits: body.limits ?? null, error: null };
}

export function PricingPlans({ priceLabel }: { priceLabel: string | null }) {
  const router = useRouter();
  const search = useSearchParams();
  const returned = search.get("status") === "success";
  const [plan, setPlan] = useState<Plan>("free");
  const [signedIn, setSignedIn] = useState(false);
  const [usage, setUsage] = useState<Usage>({});
  const [limits, setLimits] = useState<Limits | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void readPlan().then((next) => {
      if (cancelled) return;
      setSignedIn(next.signedIn);
      setPlan(next.plan);
      setUsage(next.usage);
      setLimits(next.limits);
      if (next.error) setError(next.error);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!returned || !signedIn || plan === "pro") return;
    const timer = window.setInterval(() => {
      void readPlan().then((next) => {
        setSignedIn(next.signedIn);
        setPlan(next.plan);
      });
    }, 2500);
    return () => window.clearInterval(timer);
  }, [returned, signedIn, plan]);

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/billing/checkout", { method: "POST" });
      const body = (await response.json()) as { checkout_url?: string; message?: string };
      if (response.status === 401) {
        router.push("/login?next=/pricing");
        return;
      }
      if (!response.ok || !body.checkout_url) {
        throw new Error(body.message ?? "Could not start checkout.");
      }
      window.location.assign(body.checkout_url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Could not start checkout.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-16 sm:py-20">
      <PageIntro title="Pricing">
        Create and export for free. Pro adds higher monthly limits, JPG files, and the publishing handoff.
      </PageIntro>
      {returned && plan !== "pro" ? (
        <p className="mt-6 max-w-xl text-[15px] font-light leading-6 text-ink-soft">
          Checkout finished. Your plan will update as soon as the payment confirmation arrives.
        </p>
      ) : null}
      {error ? <p className="mt-6 text-sm text-destructive">{error}</p> : null}
      <Settle className="mt-10 grid gap-4 md:grid-cols-2">
        <section className="flex flex-col rounded-[24px] border border-black/8 bg-white p-6 sm:p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Free</p>
          <p className="mt-4 text-[40px] font-light tracking-[-0.04em] text-black">$0</p>
          <ul className="mt-6 space-y-2 text-[15px] font-light leading-6 text-ink-soft">
            <li>Brand kit, editor, and PNG or PDF export</li>
            <li>5 carousels and 10 AI generations each month</li>
            <li>20 exports for Cursor, Claude, ChatGPT, or the web app</li>
          </ul>
          <div className="mt-8">
            <Link
              href={signedIn ? "/new" : "/signup"}
              className="inline-flex min-h-10 items-center rounded-[14px] border border-black/10 bg-white px-4 text-sm font-medium motion-safe:transition-colors motion-safe:duration-150 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {signedIn ? "Start a carousel" : "Start for free"}
            </Link>
          </div>
        </section>
        <section className="flex flex-col rounded-[24px] border border-accent bg-white p-6 sm:p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">Pro</p>
          <p className="mt-4 text-[40px] font-light tracking-[-0.04em] text-black">
            {priceLabel ?? "Monthly"}
          </p>
          <p className="text-[14px] font-light text-ink-soft">
            {priceLabel ? "per month" : "Price shown at checkout"}
          </p>
          <ul className="mt-6 space-y-2 text-[15px] font-light leading-6 text-ink-soft">
            <li>Everything on Free</li>
            <li>100 carousels, 250 AI generations, and 1,000 exports each month</li>
            <li>JPG export and an approval-first publishing handoff</li>
          </ul>
          <div className="mt-8">
            {plan === "pro" ? (
              <p className="inline-flex min-h-10 items-center text-sm font-medium text-black">Current plan</p>
            ) : (
              <Button onClick={() => void checkout()} disabled={busy}>
                {busy ? "Opening checkout…" : !loaded ? "Choose Pro" : signedIn ? "Upgrade to Pro" : "Sign in to upgrade"}
              </Button>
            )}
          </div>
        </section>
      </Settle>
      {signedIn && limits ? (
        <section className="mt-6 rounded-[24px] border border-black/8 bg-white p-6 sm:p-8">
          <h2 className="text-lg font-medium tracking-[-0.02em]">This month</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {(["carousel", "generation", "export"] as const).map((kind) => (
              <div key={kind}>
                <p className="font-mono text-2xl tabular-nums">{usage[kind] ?? 0} <span className="text-sm text-ink-faint">/ {limits[kind]}</span></p>
                <p className="mt-1 text-sm capitalize text-ink-soft">{kind === "carousel" ? "carousels" : `${kind}s`}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
