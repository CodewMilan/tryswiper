"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Stack } from "@phosphor-icons/react";
import { SlidePreview } from "@/components/editor/slide-frame";
import { formatExample, FORMAT_EXAMPLE_THEME } from "@/components/format-examples";
import { Button } from "@/components/ui/button";

export type FormatCard = {
  id: string;
  name: string;
  description: string;
  count: string;
  hook: string;
  roles: string[];
};

type RailPosition = { page: number; stops: number[]; first: number; last: number };

export function FormatRail({ items }: { items: FormatCard[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const id = useId();
  const [position, setPosition] = useState<RailPosition>({ page: 0, stops: [0], first: 1, last: 1 });

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    let frame = 0;

    function measure() {
      if (!node) return;
      const cards = Array.from(node.children) as HTMLElement[];
      const max = Math.max(0, node.scrollWidth - node.clientWidth);
      const offsets = cards.map((card) => card.offsetLeft - cards[0].offsetLeft);
      const stops = [...new Set(offsets.map((offset) => Math.min(offset, max)))];
      let page = 0;
      for (let index = 1; index < stops.length; index++) {
        if (Math.abs(stops[index] - node.scrollLeft) < Math.abs(stops[page] - node.scrollLeft)) page = index;
      }
      const first = Math.max(0, offsets.findIndex((offset, index) => offset + cards[index].offsetWidth > node.scrollLeft + 8));
      const visible = offsets.filter((offset) => offset < node.scrollLeft + node.clientWidth - 8).length;
      setPosition({ page, stops, first: first + 1, last: visible });
    }

    function onScroll() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    node.addEventListener("scroll", onScroll, { passive: true });
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      node.removeEventListener("scroll", onScroll);
    };
  }, [items.length]);

  function goTo(page: number) {
    const node = scroller.current;
    if (!node) return;
    const next = Math.max(0, Math.min(page, position.stops.length - 1));
    node.scrollTo({
      left: position.stops[next],
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  return (
    <div role="region" aria-roledescription="carousel" aria-labelledby={`${id}-heading`}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h2 id={`${id}-heading`} className="max-w-2xl text-[32px] font-light leading-[1.12] tracking-[-0.03em] text-foreground sm:text-[40px]">
            Formats the agent already knows
          </h2>
          <p className="mt-3 max-w-xl text-base font-normal leading-6 text-muted-foreground">
            A strong story starts with the right structure.
          </p>
        </div>
        {items.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" className="size-11 rounded-full p-0" aria-label="Previous formats" aria-controls={`${id}-track`} disabled={position.page === 0} onClick={() => goTo(position.page - 1)}>
              <ArrowLeft size={20} aria-hidden weight="regular" />
            </Button>
            <Button variant="outline" className="size-11 rounded-full p-0" aria-label="Next formats" aria-controls={`${id}-track`} disabled={position.page >= position.stops.length - 1} onClick={() => goTo(position.page + 1)}>
              <ArrowRight size={20} aria-hidden weight="regular" />
            </Button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-muted-foreground">New formats are on the way.</p>
      ) : (
        <>
          <div
            ref={scroller}
            id={`${id}-track`}
            tabIndex={0}
            aria-label="Carousel formats. Use left and right arrow keys to browse."
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return;
              if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              if (event.key === "Home") goTo(0);
              else if (event.key === "End") goTo(position.stops.length - 1);
              else goTo(position.page + (event.key === "ArrowRight" ? 1 : -1));
            }}
            className="relative flex snap-x snap-mandatory gap-5 overflow-x-auto rounded-[20px] pb-2 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item, index) => (
              <article
                key={item.id}
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${items.length}: ${item.name}`}
                className="w-[calc(100%-24px)] shrink-0 snap-start overflow-hidden rounded-[20px] border border-border bg-card sm:w-[340px] lg:w-[calc((100%-40px)/3)]"
              >
                <div className="relative flex h-[352px] items-center justify-center overflow-hidden bg-secondary">
                  <div className="absolute inset-x-5 top-4 flex items-center justify-between text-xs font-normal text-muted-foreground">
                    <span>Example hook</span>
                    <span className="font-mono">4:5</span>
                  </div>
                  <div className="mt-5 rounded-md shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--foreground)_18%,transparent)]">
                    <SlidePreview slide={formatExample(item.id, item.hook)} theme={FORMAT_EXAMPLE_THEME} width={224} />
                  </div>
                </div>
                <div className="flex min-h-[188px] flex-col border-t border-border p-5 sm:p-6">
                  <div className="mb-3 flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                    <Stack size={16} aria-hidden />
                    <span>{item.count}</span>
                  </div>
                  <h3 className="text-[19px] font-medium leading-6 tracking-[-0.025em] text-foreground">{item.name}</h3>
                  <p className="mt-2 text-sm font-normal leading-[1.65] text-muted-foreground">{item.description}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-4 flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p aria-live="polite" aria-atomic="true" className="text-xs font-normal text-muted-foreground">
              Showing {position.first}{position.last > position.first ? `–${position.last}` : ""} of {items.length} formats
            </p>
            <div className="flex gap-0.5 sm:gap-2" aria-label="Format pages">
              {position.stops.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Go to format page ${index + 1}`}
                  aria-current={position.page === index ? "true" : undefined}
                  aria-controls={`${id}-track`}
                  onClick={() => goTo(index)}
                  className="group flex size-11 items-center justify-center rounded-md px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className={`h-1 w-full rounded-full motion-safe:transition-colors motion-safe:duration-150 ${position.page === index ? "bg-foreground" : "bg-foreground/15 group-hover:bg-foreground/35"}`} />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
