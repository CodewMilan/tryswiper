"use client";

import { useState } from "react";
import type { Carousel } from "@swiper/schema";
import { SlidePreview } from "./slide-frame";

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
    <ol className="mt-2 space-y-2">
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
          className={`rounded-md ${
            overIndex === slideIndex && dragId !== slide.id ? "ring-2 ring-accent" : ""
          } ${dragId === slide.id ? "opacity-50" : ""}`}
        >
          <div
            className={`flex items-center gap-2 rounded-md p-1 ${
              slideIndex === index ? "bg-secondary" : "hover:bg-secondary/60"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(slideIndex)}
              className="flex flex-1 items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-current={slideIndex === index}
            >
              <span className="cursor-grab text-xs text-ink-faint" aria-hidden>
                ⠿
              </span>
              <SlidePreview slide={slide} theme={carousel.theme} width={40} />
              <span className="text-sm">
                {slideIndex + 1}. {slide.role}
              </span>
            </button>
            <span className="flex flex-col">
              <button
                type="button"
                aria-label={`Move ${slide.role} earlier`}
                disabled={slideIndex === 0}
                onClick={() => onReorder(slide.id, slideIndex - 1)}
                className="px-1 text-xs text-ink-soft disabled:opacity-30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Move ${slide.role} later`}
                disabled={slideIndex === slides.length - 1}
                onClick={() => onReorder(slide.id, slideIndex + 1)}
                className="px-1 text-xs text-ink-soft disabled:opacity-30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                ↓
              </button>
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
