"use client";

import type { CSSProperties } from "react";
import type { Carousel, CarouselElement, Slide } from "@swiper/schema";
import { CANVAS_HEIGHT, CANVAS_WIDTH, carouselFontFamily } from "@swiper/schema";

export type Box = { x: number; y: number; width: number; height: number };

export const MIN_SIZE = 40;

export function boxOf(element: CarouselElement): Box {
  return { x: element.x, y: element.y, width: element.width, height: element.height };
}

export function sameBox(a: Box, b: Box) {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

export function clampBox(box: Box): Box {
  const width = Math.round(Math.min(Math.max(MIN_SIZE, box.width), CANVAS_WIDTH));
  const height = Math.round(Math.min(Math.max(MIN_SIZE, box.height), CANVAS_HEIGHT));
  return {
    width,
    height,
    x: Math.round(Math.min(Math.max(0, box.x), CANVAS_WIDTH - width)),
    y: Math.round(Math.min(Math.max(0, box.y), CANVAS_HEIGHT - height)),
  };
}

export function frameStyle(
  slide: Slide,
  theme: Carousel["theme"],
  width: number | string,
): CSSProperties {
  return {
    width,
    aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
    background: slide.background.value || theme.background,
    fontFamily: theme.fontFamily,
  };
}

/** Positions an element as a percentage of the canvas so any frame width works. */
export function elementStyle(
  element: CarouselElement,
  theme: Carousel["theme"],
  frameWidth: number,
  box: Box = boxOf(element),
): CSSProperties {
  return {
    left: `${(box.x / CANVAS_WIDTH) * 100}%`,
    top: `${(box.y / CANVAS_HEIGHT) * 100}%`,
    width: `${(box.width / CANVAS_WIDTH) * 100}%`,
    height: `${(box.height / CANVAS_HEIGHT) * 100}%`,
    color: element.style?.color ?? (element.type === "shape" || element.type === "line" ? theme.accent : theme.primary),
    fontSize: `${(element.style?.fontSize ?? 24) * (frameWidth / CANVAS_WIDTH)}px`,
    fontWeight: element.style?.fontWeight ?? 500,
    fontFamily: carouselFontFamily(element.role === "headline" ? theme.fontFamily : (theme.bodyFontFamily ?? theme.fontFamily)),
    textAlign: element.style?.align,
    lineHeight: element.style?.lineHeight ?? 1.2,
    letterSpacing: (element.style?.letterSpacing ?? 0) * (frameWidth / CANVAS_WIDTH),
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  };
}

export function ElementContent({ element }: { element: CarouselElement }) {
  const imageSrc = element.assetId ? `/api/v1/assets/${element.assetId}` : element.src;
  if (imageSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageSrc}
        alt={element.role ?? "Slide image"}
        draggable={false}
        className={`pointer-events-none h-full w-full ${element.type === "logo" ? "object-contain" : "object-cover"}`}
      />
    );
  }
  if (element.type === "line") {
    return (
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 h-0.5"
        style={{ background: "currentColor" }}
      />
    );
  }
  if (element.type === "shape") {
    return (
      <span
        aria-hidden
        className="pointer-events-none block h-full w-full"
        style={{ background: "currentColor" }}
      />
    );
  }
  return <span className="pointer-events-none">{element.text}</span>;
}

export function SlidePreview({
  slide,
  theme,
  width,
}: {
  slide: Slide;
  theme: Carousel["theme"];
  width: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-[6px]" style={frameStyle(slide, theme, width)}>
      {slide.elements.map((element) => (
        <div
          key={element.id}
          className="absolute overflow-hidden"
          style={elementStyle(element, theme, width)}
        >
          <ElementContent element={element} />
        </div>
      ))}
    </div>
  );
}
