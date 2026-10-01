"use client";

import { useRef } from "react";

export type FormatCard = {
  id: string;
  name: string;
  description: string;
  count: string;
  hook: string;
};

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
            className="inline-flex size-10 items-center justify-center rounded-full border border-black/10 bg-white text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Next formats"
            onClick={() => scrollByCard(1)}
            className="inline-flex size-10 items-center justify-center rounded-full border border-black/10 bg-white text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            →
          </button>
        </div>
      </div>
      <div
        ref={scroller}
        className="flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none]"
      >
        {items.map((item) => (
          <article
            key={item.id}
            className="w-[300px] shrink-0 snap-start sm:w-[320px]"
          >
            <div className="flex h-44 items-end rounded-2xl border border-black/6 bg-[#f3f3f1] p-4">
              <div className="w-[46%] rounded-xl bg-white p-3 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Hook</p>
                <p className="mt-2 text-[13px] font-medium leading-4 tracking-[-0.02em] text-black">
                  {item.hook}
                </p>
              </div>
            </div>
            <p className="mt-4 inline-flex rounded-md bg-white px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
              {item.count}
            </p>
            <h3 className="mt-3 text-[18px] font-medium tracking-[-0.02em] text-black">{item.name}</h3>
            <p className="mt-2 text-[15px] font-light leading-6 text-ink-soft">{item.description}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
