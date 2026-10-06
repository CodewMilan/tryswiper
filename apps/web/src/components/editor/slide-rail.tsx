"use client";

import { useState } from "react";
import type { Carousel } from "@swiper/schema";
import { SlidePreview } from "./slide-frame";
import { ArrowUp, ArrowDown, DotsSixVertical } from "@phosphor-icons/react";

export function SlideRail({
  carousel,
  index,
  onSelect,
  onReorder,
}: {
  carousel: Carousel;
  index: number;
  onSelect: (index: number) => void;
  onReorder: (slideId: string, toIndex: number) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const slides = carousel.slides;

  return (
    <ol aria-label="Slides" className="flex gap-3 overflow-x-auto p-3 lg:flex-col lg:overflow-x-visible">
      {slides.map((slide, slideIndex) => (
        <li
          key={slide.id}
          draggable
          onDragStart={(event) => {
            setDragId(slide.id);
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", slide.id);
          }}
          onDragOver={(event) => {
            if (!dragId) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setOverIndex(slideIndex);
          }}
          onDrop={(event) => {
            event.preventDefault();
            const id = dragId ?? event.dataTransfer.getData("text/plain");
            if (id) onReorder(id, slideIndex);
            setDragId(null);
            setOverIndex(null);
          }}
          onDragEnd={() => {
            setDragId(null);
            setOverIndex(null);
          }}
          data-testid="slide-item"
          className={`w-36 shrink-0 rounded-xl lg:w-full ${
            overIndex === slideIndex && dragId !== slide.id ? "ring-2 ring-accent" : ""
          } ${dragId === slide.id ? "opacity-50" : ""}`}
        >
          <div
            className={`group rounded-xl border p-2 ${
              slideIndex === index ? "border-foreground bg-secondary" : "border-transparent hover:bg-secondary/60"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(slideIndex)}
              className="flex w-full flex-col items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-current={slideIndex === index}
            >
              <div className="pointer-events-none"><SlidePreview slide={slide} theme={carousel.theme} width={112} /></div>
              <span className="flex w-full items-center gap-2 text-xs font-medium capitalize">
                <span className="font-mono text-ink-soft">{String(slideIndex + 1).padStart(2, "0")}</span> {slide.role}
              </span>
            </button>
            <span className="mt-1 flex items-center justify-between">
              <DotsSixVertical size={16} className="cursor-grab text-ink-soft" aria-hidden />
              <span className="flex">
              <button
                type="button"
                aria-label={`Move ${slide.role} earlier`}
                disabled={slideIndex === 0}
                onClick={() => onReorder(slide.id, slideIndex - 1)}
                className="grid size-8 place-items-center rounded-md text-ink-soft disabled:opacity-30 hover:bg-card focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                aria-label={`Move ${slide.role} later`}
                disabled={slideIndex === slides.length - 1}
                onClick={() => onReorder(slide.id, slideIndex + 1)}
                className="grid size-8 place-items-center rounded-md text-ink-soft disabled:opacity-30 hover:bg-card focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowDown size={14} />
              </button>
              </span>
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
