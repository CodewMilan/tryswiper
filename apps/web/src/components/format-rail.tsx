"use client";

import { useRef } from "react";
import { SpotlightCard } from "@/components/motion/spotlight-card";

export type FormatCard = {
  id: string;
  name: string;
  description: string;
  count: string;
  hook: string;
  roles: string[];
};

const SCHEMATICS: Record<string, string> = {
  "problem-insight-product": `┌────┐
│HOOK│
└─┬──┘
  ▼
PAIN → VIEW
  │
PROOF → PROD
  │
└─ CTA`,
  "five-things": `┌──┬──┬──┐
│01│02│03│
├──┼──┼──┤
│04│05│→ │
└──┴──┴──┘
 five notes
 then one ask`,
  "before-after": `BEFORE   AFTER
░░░░░░   ██████
 tabs  →  1 doc
 mess     clean
     │
   [CTA]`,
  "myth-reality": `  “MYTH”
   ~~~~
     ↓
  REALITY
   ════
 product as
 the mechanic`,
  "step-by-step": `1 ●────
2 ●────
3 ●────
4 ●────
      ╲
     CTA
 do it here`,
  "product-teardown": `┌────────┐
│ surface│
├────────┤
│mechanic│
├────────┤
│  edge  │
└────────┘
  honest
  limit`,
};

function schematicFor(id: string, roles: string[]) {
  if (SCHEMATICS[id]) return SCHEMATICS[id];
  return roles
    .slice(0, 6)
    .map((role, index) => `${String(index + 1).padStart(2, "0")}  ${role.toUpperCase()}`)
    .join("\n");
}

function label(role: string | undefined, fallback: string) {
  if (!role) return fallback;
  return role.replace(/-/g, " ").toUpperCase();
}

export function FormatRail({ items }: { items: FormatCard[] }) {
  const scroller = useRef<HTMLDivElement>(null);

  function scrollByCard(direction: number) {
    const node = scroller.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollBy({ left: direction * 340, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="max-w-xl text-[32px] font-light leading-tight tracking-[-0.02em] text-black sm:text-[40px]">
          Formats the agent already knows
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Previous formats"
            onClick={() => scrollByCard(-1)}
            className="inline-flex size-10 items-center justify-center rounded-full border border-black/10 bg-white text-black motion-safe:transition-[transform,background-color,color] motion-safe:duration-150 hover:scale-[1.04] hover:bg-black hover:text-white active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Next formats"
            onClick={() => scrollByCard(1)}
            className="inline-flex size-10 items-center justify-center rounded-full border border-black/10 bg-white text-black motion-safe:transition-[transform,background-color,color] motion-safe:duration-150 hover:scale-[1.04] hover:bg-black hover:text-white active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            →
          </button>
        </div>
      </div>
      <div className="relative">
        <div
          ref={scroller}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              scrollByCard(1);
            }
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              scrollByCard(-1);
            }
          }}
          className="flex snap-x gap-4 overflow-x-auto pb-3 [scrollbar-width:none] focus-visible:outline-none"
        >
          {items.map((item) => (
            <article
              key={item.id}
              className="group w-[280px] shrink-0 snap-start sm:w-[300px]"
            >
              <SpotlightCard className="rounded-[20px] border border-black/6 bg-[#ecece9]">
                <FormatPreview item={item} />
              </SpotlightCard>
              <p className="mt-4 inline-flex rounded-md bg-white px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                {item.count}
              </p>
              <h3 className="mt-3 text-[18px] font-medium tracking-[-0.02em] text-black">{item.name}</h3>
              <p className="mt-2 text-[15px] font-light leading-6 text-ink-soft">{item.description}</p>
            </article>
          ))}
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent"
        />
      </div>
    </div>
  );
}

function FormatPreview({ item }: { item: FormatCard }) {
  const ascii = schematicFor(item.id, item.roles);
  const mid = label(item.roles[1], "02");
  const back = label(item.roles[2], "03");

  return (
    <div className="relative h-[236px] overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.045) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div
        aria-hidden
        className="absolute right-5 top-8 aspect-[4/5] w-[42%] rounded-xl border border-black/8 bg-white/55 shadow-sm motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)] rotate-[8deg] group-hover:rotate-[12deg]"
      >
        <p className="px-2 pt-2 font-mono text-[9px] tracking-[0.12em] text-ink-faint">03</p>
        <p className="px-2 text-[10px] font-medium uppercase tracking-[0.08em] text-black/50">{back}</p>
      </div>
      <div
        aria-hidden
        className="absolute right-9 top-6 aspect-[4/5] w-[42%] rounded-xl border border-black/8 bg-white/80 shadow-sm motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)] rotate-[4deg] group-hover:rotate-[7deg]"
      >
        <p className="px-2 pt-2 font-mono text-[9px] tracking-[0.12em] text-ink-faint">02</p>
        <p className="px-2 text-[10px] font-medium uppercase tracking-[0.08em] text-black/60">{mid}</p>
      </div>
      <div className="absolute left-4 top-4 flex aspect-[4/5] w-[48%] flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_12px_28px_-16px_rgba(0,0,0,0.45)] motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-0.5">
        <div className="flex items-center justify-between border-b border-black/6 px-2.5 py-1.5">
          <p className="font-mono text-[9px] tracking-[0.14em] text-accent">01 · HOOK</p>
          <span className="size-1.5 rounded-full bg-accent" />
        </div>
        <pre className="flex-1 overflow-hidden px-2.5 py-2 font-mono text-[10px] leading-[13px] tracking-[-0.02em] text-black/70">
          {ascii}
        </pre>
        <p className="border-t border-black/6 px-2.5 py-1.5 text-[9px] font-medium leading-3 tracking-[-0.02em] text-black">
          {item.hook}
        </p>
      </div>
    </div>
  );
}
