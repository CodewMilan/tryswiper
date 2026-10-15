"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, ArrowUpRight, Plus } from "@phosphor-icons/react";
import { Settle } from "@/components/page-intro";
import { PLANS, PLAN_IDS, isPaidPlan, planName, type Plan, type PaidPlan } from "@/lib/plans";
import { Button } from "@/components/ui/button";

type Usage = Partial<Record<"carousel" | "generation" | "export" | "publish", number>>;
type Limits = Record<"carousel" | "generation" | "export" | "publish", number> & { jpg: boolean };

async function readPlan() {
  try {
  const response = await fetch("/api/v1/billing", { cache: "no-store" });
  if (response.status === 401) return { signedIn: false, plan: "free" as Plan, usage: {} as Usage, limits: null as Limits | null, error: null };
  const body = (await response.json()) as { plan?: Plan; usage?: Usage; limits?: Limits; message?: string; has_billing_customer?: boolean };
  if (!response.ok) {
    return { signedIn: null, plan: "free" as Plan, usage: {} as Usage, limits: null as Limits | null, error: body.message ?? "Could not load the plan." };
  }
  return { signedIn: true, plan: (isPaidPlan(body.plan) ? body.plan : "free") as Plan, usage: body.usage ?? {}, limits: body.limits ?? null, error: null, hasCustomer: body.has_billing_customer ?? false };
  } catch { return { signedIn: null, plan: "free" as Plan, usage: {} as Usage, limits: null as Limits | null, error: "Could not load your plan. Check your connection and try again." }; }
}

export function PricingPlans({ checkoutAvailability, initialSignedIn }: { checkoutAvailability: Record<PaidPlan, boolean>; initialSignedIn: boolean }) {
  const router = useRouter();
  const search = useSearchParams();
  const returned = search.get("status") === "success";
  const [plan, setPlan] = useState<Plan>("free");
  const [signedIn, setSignedIn] = useState(initialSignedIn);
  const [usage, setUsage] = useState<Usage>({});
  const [limits, setLimits] = useState<Limits | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [hasCustomer, setHasCustomer] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void readPlan().then((next) => {
      if (cancelled) return;
      if (next.signedIn !== null) setSignedIn(next.signedIn);
      setPlan(next.plan);
      setUsage(next.usage);
      setLimits(next.limits);
      setError(next.error);
      setHasCustomer("hasCustomer" in next && Boolean(next.hasCustomer));
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    if (!returned || !signedIn || isPaidPlan(plan)) return;
    let checks = 0;
    let active = true;
    const timer = window.setInterval(() => {
      if (++checks > 12) { window.clearInterval(timer); return; }
      void readPlan().then((next) => {
        if (!active || next.error) return;
        if (next.signedIn !== null) setSignedIn(next.signedIn);
        setPlan(next.plan);
        setUsage(next.usage);
        setLimits(next.limits);
        setHasCustomer("hasCustomer" in next && Boolean(next.hasCustomer));
      });
    }, 2500);
    return () => { active = false; window.clearInterval(timer); };
  }, [returned, signedIn, plan]);

  async function checkout(target: PaidPlan) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: target }) });
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

  async function manageSubscription() {
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/v1/billing/portal", { method: "POST" });
      const body = await response.json() as { portal_url?: string; message?: string };
      if (!response.ok || !body.portal_url) throw new Error(body.message ?? "Could not open subscription management.");
      window.location.assign(body.portal_url);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not open subscription management."); setBusy(false); }
  }

  function planAction(id: Plan) {
    const featured = id === "pro";
    const linkClass = `inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] px-4 text-sm font-medium motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${featured ? "bg-white text-black hover:bg-white/90 focus-visible:ring-offset-primary" : "border border-border bg-card text-foreground hover:bg-secondary"}`;
    if (id === "free") return <Link className={linkClass} href={signedIn ? "/new" : "/signup"}>{signedIn ? "Start a carousel" : "Start for free"}<ArrowUpRight size={16} aria-hidden /></Link>;
    if (loaded && signedIn && plan === id) return <Link className={linkClass} href="/library">Open your library<ArrowUpRight size={16} aria-hidden /></Link>;
    const email = `mailto:milan@cassettelabs.in?subject=${encodeURIComponent(`Swiper ${PLANS[id].name} ${isPaidPlan(plan) ? "plan change" : "access"}`)}`;
    if (signedIn && hasCustomer && isPaidPlan(plan)) return <a className={linkClass} href={email}>Contact us to change plans<ArrowUpRight size={16} aria-hidden /></a>;
    if (!checkoutAvailability[id]) return <a className={linkClass} href={email}>Request {PLANS[id].name} access<ArrowUpRight size={16} aria-hidden /></a>;
    if (!signedIn) return <Link className={linkClass} href="/signup?next=%2Fpricing">Choose {PLANS[id].name}<ArrowUpRight size={16} aria-hidden /></Link>;
    return <Button className={`w-full ${featured ? "bg-white text-black hover:bg-white/90 focus-visible:ring-offset-primary" : ""}`} variant={featured ? "default" : "outline"} onClick={() => void checkout(id)} disabled={busy || !loaded}>{busy ? "Opening checkout…" : `Upgrade to ${PLANS[id].name}`}</Button>;
  }

  const faqs = [
    { question: "What uses an AI credit?", answer: "One successful AI-generated carousel or one AI slide revision uses one credit. Manual creation, editing, checks, and saving formats do not. A local fallback draft does not spend an AI credit. Your own agent subscription is separate from Swiper." },
    { question: "What counts as an export?", answer: "Each PNG or JPG ZIP download, or PDF download, uses one export. A ZIP contains all the slides in that carousel. Previewing and checking do not use exports. JSON backups are unmetered." },
    { question: "When do my allowances reset?", answer: "On the first day of each calendar month, in UTC. Unused allowances do not roll over. Deleting a carousel created this month frees that carousel slot; used AI credits and exports stay counted." },
    { question: "Can I manage or change my subscription?", answer: "Manage subscription opens your billing portal for invoices, payment details, and cancellation. Contact support to change between Pro and Studio. Your verified subscription determines when paid access ends." },
    { question: "Will Swiper post to my social accounts?", answer: "You review the carousel and download the files, then upload them to your social platform. Swiper does not post or schedule automatically. Every plan includes the editor, brand kit, saved formats, and agent connection." },
  ];

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 pb-20 pt-36 sm:pb-28 sm:pt-40">
      <header className="max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">Pricing</p>
        <h1 className="mt-5 text-[40px] font-medium leading-[1.08] tracking-[-0.045em] sm:text-[60px]">A plan for your<br className="hidden sm:block" /> next idea. And the next.</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-ink-soft">Start with a few posts. Find your rhythm. Choose more room when you need it. The same editor and agent tools, on every plan.</p>
        <p className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"><span className="inline-flex items-center gap-2"><Check size={16} aria-hidden /> Monthly billing</span><span className="inline-flex items-center gap-2"><Check size={16} aria-hidden /> No card needed for Free</span></p>
      </header>
      {returned && !isPaidPlan(plan) ? <p role="status" className="mt-7 max-w-2xl text-sm leading-6">We’re checking your payment confirmation. Your plan updates after it arrives. <button className="min-h-11 underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setAttempt((value) => value + 1)}>Refresh plan</button></p> : null}
      {error ? <div role="alert" className="mt-7 flex flex-wrap items-center gap-3"><p className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>Retry plan check</Button></div> : null}
      <Settle className="mt-12 grid gap-4 md:grid-cols-3">
        {PLAN_IDS.map((id) => {
          const offer = PLANS[id]; const featured = id === "pro"; const current = loaded && signedIn && plan === id;
          return <section key={id} aria-labelledby={`plan-${id}`} className={`flex flex-col rounded-[24px] border p-6 lg:p-8 ${featured ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-card-foreground"}`}>
            <div className="flex min-h-7 items-center justify-between gap-3"><h2 id={`plan-${id}`} className="text-xl font-medium tracking-tight">{offer.name}</h2>{current ? <span className={`rounded-full px-3 py-1 text-xs ${featured ? "bg-white/15" : "bg-secondary"}`}>Current plan</span> : featured ? <span className="rounded-full bg-white/15 px-3 py-1 text-xs">Recommended</span> : null}</div>
            <p className={`mt-3 min-h-12 text-sm leading-6 ${featured ? "text-white/75" : "text-ink-soft"}`}>{offer.description}</p>
            <div className="mt-6 flex items-baseline gap-1"><span className="text-[54px] font-medium leading-none tracking-[-0.05em]">${offer.monthlyPriceCents / 100}</span><span className={`ml-1 text-sm ${featured ? "text-white/75" : "text-ink-soft"}`}>/ month</span></div>
            <p className={`mt-3 text-xs ${featured ? "text-white/75" : "text-ink-soft"}`}>{id === "free" ? "Free to get started" : "USD · billed monthly"}</p>
            <dl className={`mt-8 divide-y border-y ${featured ? "divide-white/15 border-white/15" : "divide-border border-border"}`}>
              {([["carousel", "Carousels"], ["generation", "AI credits"], ["export", "Exports"]] as const).map(([kind, label]) => <div key={kind} className="flex items-baseline justify-between gap-3 py-3"><dt className={`text-sm ${featured ? "text-white/80" : "text-ink-soft"}`}>{label}<span className="sr-only"> per month</span></dt><dd className="font-mono text-base tabular-nums">{offer.limits[kind].toLocaleString("en-US")}</dd></div>)}
            </dl>
            <ul className={`mt-6 space-y-3 text-sm leading-5 ${featured ? "text-white/85" : "text-ink-soft"}`}>
              {(id === "free" ? ["PNG and PDF downloads", "Brand kit and manual editing", "Saved formats and agent connection"] : ["Everything on Free", "PNG, PDF and JPG downloads", "More drafts, revisions and downloads"]).map((feature) => <li key={feature} className="flex items-start gap-2.5"><Check className="mt-0.5 shrink-0" size={16} aria-hidden />{feature}</li>)}
            </ul>
            <div className="mt-auto pt-8">{planAction(id)}</div>
          </section>;
        })}
      </Settle>
      <p className="mt-5 text-sm leading-6 text-ink-soft">All allowances are per workspace, per calendar month. Prices are in USD; applicable taxes are shown at checkout.</p>
      {!checkoutAvailability.pro || !checkoutAvailability.studio ? <p className="mt-2 text-sm leading-6 text-ink-soft">Paid access is not yet available online{!checkoutAvailability.pro && !checkoutAvailability.studio ? "." : ` for ${!checkoutAvailability.pro ? "Pro" : "Studio"}.`} You can start free or request access by email.</p> : null}
      {signedIn && hasCustomer ? <div className="mt-7 flex flex-wrap items-center gap-4"><Button variant="outline" disabled={busy} onClick={() => void manageSubscription()}>{busy ? "Opening…" : "Manage subscription"}</Button><p className="max-w-md text-sm leading-6 text-ink-soft">View invoices, update payment details, or manage cancellation.</p></div> : null}
      {signedIn && limits ? <section aria-labelledby="monthly-usage" className="mt-10 rounded-[24px] border border-border bg-card p-6 sm:p-8"><div className="flex flex-wrap items-baseline justify-between gap-2"><h2 id="monthly-usage" className="text-lg font-medium">Your {planName(plan)} workspace this month</h2><p className="text-xs text-ink-soft">Resets on the first of each month (UTC)</p></div><div className="mt-6 grid gap-6 sm:grid-cols-3">{([["carousel", "Carousels"], ["generation", "AI credits"], ["export", "Exports"]] as const).map(([kind, label]) => <div key={kind}><p className="flex items-center justify-between gap-2 text-sm"><span>{label}</span><span className="font-mono tabular-nums">{usage[kind] ?? 0} / {limits[kind]}</span></p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, (usage[kind] ?? 0) / Math.max(1, limits[kind]) * 100))}%` }} /></div></div>)}</div></section> : null}
      <section className="mt-16 border-y border-border py-8 sm:mt-20"><h2 className="text-lg font-medium tracking-tight">Every plan gets the full workflow.</h2><div className="mt-5 grid gap-5 text-sm leading-6 text-ink-soft sm:grid-cols-3"><p><span className="block font-medium text-foreground">Your brand, your design.</span>Colors, fonts, logos and saved formats. Keep a design that works and reuse it.</p><p><span className="block font-medium text-foreground">Create with your agent.</span>Connect Cursor, Claude or ChatGPT, or start directly in the browser.</p><p><span className="block font-medium text-foreground">Review before you share.</span>Edit every slide, run checks, then download files to upload yourself.</p></div></section>
      <section className="mt-16 grid gap-8 lg:grid-cols-[1fr_2fr] sm:mt-20"><div><h2 className="text-2xl font-medium tracking-tight">A few things to know.</h2><p className="mt-3 text-sm leading-6 text-ink-soft">Still have a question? <a className="underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring" href="mailto:milan@cassettelabs.in">Email support</a>.</p></div><div className="divide-y divide-border">{faqs.map(({ question, answer }) => <details key={question} className="group"><summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">{question}<Plus size={16} aria-hidden className="shrink-0 group-open:rotate-45 motion-safe:transition-transform" /></summary><p className="pb-5 pr-6 text-sm leading-7 text-ink-soft">{answer}</p></details>)}</div></section>
    </div>
  );
}
