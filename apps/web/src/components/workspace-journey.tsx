"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { ArrowRight, CheckCircle, Circle, PlugsConnected, PaintBrush, Stack } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function WorkspaceJourney({ hasCarousels }: { hasCarousels: boolean }) {
  const [setup, setSetup] = useState<{ brand: boolean; agent: boolean } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [expanded, setExpanded] = useState(!hasCarousels);
  const stepsId = useId();

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [brandResponse, keyResponse] = await Promise.all([fetch("/api/v1/brand"), fetch("/api/v1/mcp-keys")]);
        if (!brandResponse.ok || !keyResponse.ok) throw new Error("Setup unavailable");
        const { brand } = await brandResponse.json() as { brand?: { description?: string; audience?: string } };
        const { keys } = await keyResponse.json() as { keys: { revokedAt: string | null; lastUsedAt: string | null }[] };
        if (active) {
          setSetup({ brand: !!brand?.description?.trim() && !!brand?.audience?.trim(), agent: keys.some((key) => !key.revokedAt && !!key.lastUsedAt) });
          setFailed(false);
        }
      } catch { if (active) setFailed(true); }
    }
    void load();
    return () => { active = false; };
  }, [attempt]);

  const steps = [
    { title: "Make it yours", body: "Add your product, audience, and visual style. Defaults work while you get started.", href: "/brand", label: "Set up brand kit", done: setup?.brand, icon: PaintBrush },
    { title: "Connect your agent", body: "Give Cursor, Claude, or ChatGPT access to create in your workspace.", href: "/connect", label: "Connect an agent", done: setup?.agent, icon: PlugsConnected },
    { title: "Create, review, export", body: "Ask your agent for a carousel, open its editor link, and finish the post here.", href: setup?.agent ? "/connect#first-prompt" : "/new", label: setup?.agent ? "Get your first prompt" : "Try in the browser", done: hasCarousels, icon: Stack },
  ];
  const complete = !!setup?.brand && !!setup?.agent && hasCarousels;

  return (
    <section aria-label="Getting started" className="mt-8 overflow-hidden rounded-[24px] border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
        <div><h2 className="text-lg font-medium tracking-tight">{complete ? "Your workspace is ready" : hasCarousels ? "Your workspace setup" : "Your first post starts here"}</h2><p className="mt-1 text-sm text-ink-soft">One brand kit. Your agent. An editable draft.</p></div>
        <div className="flex flex-wrap items-center gap-3"><Link href="/guide" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium underline underline-offset-4">How Swiper works <ArrowRight size={16} /></Link>{hasCarousels ? <Button variant="ghost" aria-expanded={expanded} aria-controls={stepsId} onClick={() => setExpanded((value) => !value)}>{expanded ? "Hide setup" : "Show setup"}</Button> : null}</div>
      </div>
      {failed ? <div className="flex flex-wrap items-center gap-3 px-6 py-3" role="alert"><p className="text-sm text-ink-soft">Setup progress couldn’t load. You can still use the links below.</p><Button variant="outline" size="sm" onClick={() => setAttempt((value) => value + 1)}>Retry progress</Button></div> : null}
      <ol id={stepsId} hidden={!expanded && hasCarousels} className={expanded || !hasCarousels ? "grid divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0" : "hidden"}>
        {steps.map((step, index) => <li key={step.href} className="flex flex-col p-6">
          <div className="flex items-center justify-between"><step.icon size={24} className="text-ink-soft" /><span className="flex items-center gap-1.5 text-xs text-ink-soft">{step.done ? <><CheckCircle size={16} weight="fill" />Done</> : <><Circle size={16} />Step {index + 1}</>}</span></div>
          <h3 className="mt-4 text-base font-medium">{step.title}</h3><p className="mb-5 mt-2 text-sm leading-6 text-ink-soft">{step.body}</p>
          <Link href={step.href} className="mt-auto inline-flex min-h-11 items-center gap-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{step.label}<ArrowRight size={16} /></Link>
        </li>)}
      </ol>
    </section>
  );
}
