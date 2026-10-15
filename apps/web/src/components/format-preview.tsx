"use client";

import { DEFAULT_THEME, getFormat, planFromFormat, renderPlanToCarousel } from "@swiper/schema";
import { SlidePreview } from "@/components/editor/slide-frame";
import type { FormatOption } from "@/lib/formats";

export function FormatPreview({ format }: { format: FormatOption }) {
  const official = getFormat(format.id);
  const preview = format.preview ?? (official && format.id !== "freeform" ? {
    slide: renderPlanToCarousel(planFromFormat(official, { productName: "Your story" }), DEFAULT_THEME).slides[0]!,
    theme: DEFAULT_THEME,
  } : null);
  return <div role="img" aria-label={`First slide preview for ${format.name}`} className="flex min-h-52 items-center justify-center rounded-2xl bg-secondary p-5">
    {preview ? <div aria-hidden className="pointer-events-none"><SlidePreview slide={preview.slide} theme={preview.theme} width={144} /></div> : <span className="text-sm text-ink-soft">Start with a blank slide</span>}
  </div>;
}
