"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Carousel, CarouselElement, Slide } from "@swiper/schema";
import { CANVAS_WIDTH } from "@swiper/schema";
import {
  boxOf,
  clampBox,
  ElementContent,
  elementStyle,
  frameStyle,
  MIN_SIZE,
  sameBox,
  type Box,
} from "./slide-frame";

const FRAME_WIDTH = 420;

type Handle = "move" | "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const RESIZE_HANDLES: { handle: Handle; label: string; position: string; cursor: string }[] = [
  { handle: "nw", label: "top left", position: "-top-1.5 -left-1.5", cursor: "nwse-resize" },
  { handle: "n", label: "top", position: "-top-1.5 left-1/2 -translate-x-1/2", cursor: "ns-resize" },
  { handle: "ne", label: "top right", position: "-top-1.5 -right-1.5", cursor: "nesw-resize" },
  { handle: "e", label: "right", position: "top-1/2 -right-1.5 -translate-y-1/2", cursor: "ew-resize" },
  { handle: "se", label: "bottom right", position: "-bottom-1.5 -right-1.5", cursor: "nwse-resize" },
  { handle: "s", label: "bottom", position: "-bottom-1.5 left-1/2 -translate-x-1/2", cursor: "ns-resize" },
  { handle: "sw", label: "bottom left", position: "-bottom-1.5 -left-1.5", cursor: "nesw-resize" },
  { handle: "w", label: "left", position: "top-1/2 -left-1.5 -translate-y-1/2", cursor: "ew-resize" },
];

function resizedBox(origin: Box, handle: Handle, dx: number, dy: number, lockAxis: boolean): Box {
  if (handle === "move") {
    let x = origin.x + dx;
    let y = origin.y + dy;
    if (lockAxis) {
      if (Math.abs(dx) > Math.abs(dy)) y = origin.y;
      else x = origin.x;
    }
    return clampBox({ ...origin, x, y });
  }

  let { x, y, width, height } = origin;
  if (handle.includes("w")) {
    const left = Math.min(x + dx, x + width - MIN_SIZE);
    width += x - left;
    x = left;
  }
  if (handle.includes("e")) width = Math.max(MIN_SIZE, width + dx);
  if (handle.includes("n")) {
    const top = Math.min(y + dy, y + height - MIN_SIZE);
    height += y - top;
    y = top;
  }
  if (handle.includes("s")) height = Math.max(MIN_SIZE, height + dy);
  return clampBox({ x, y, width, height });
}

export function SlideCanvas({
  slide,
  theme,
  selectedId,
  onSelect,
  onMove,
}: {
  slide: Slide;
  theme: Carousel["theme"];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (elementId: string, box: Box, options?: { immediate?: boolean }) => void;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; handle: Handle; x: number; y: number; origin: Box } | null>(
    null,
  );
  const [draft, setDraft] = useState<{ id: string; box: Box } | null>(null);
  // Key repeat fires faster than React re-renders, so nudges stack on their own result
  // until the slide comes back with them applied.
  const nudgeRef = useRef<{ id: string; box: Box } | null>(null);
  useEffect(() => {
    nudgeRef.current = null;
  }, [slide]);

  function toCanvasUnits(pixels: number) {
    const rect = frameRef.current?.getBoundingClientRect();
    return rect && rect.width > 0 ? pixels * (CANVAS_WIDTH / rect.width) : pixels;
  }

  function startDrag(
    event: ReactPointerEvent<HTMLElement>,
    element: CarouselElement,
    handle: Handle,
  ) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture is an optimisation; the drag still works without it.
    }
    onSelect(element.id);
    const origin = boxOf(element);
    nudgeRef.current = null;
    dragRef.current = { id: element.id, handle, x: event.clientX, y: event.clientY, origin };
    setDraft({ id: element.id, box: origin });
  }

  function continueDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = toCanvasUnits(event.clientX - drag.x);
    const dy = toCanvasUnits(event.clientY - drag.y);
    setDraft({ id: drag.id, box: resizedBox(drag.origin, drag.handle, dx, dy, event.shiftKey) });
  }

  function endDrag() {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && draft && !sameBox(draft.box, drag.origin)) {
      onMove(drag.id, draft.box, { immediate: true });
    }
    setDraft(null);
  }

  function nudge(event: React.KeyboardEvent<HTMLElement>, element: CarouselElement) {
    const step = event.shiftKey ? 24 : 4;
    const offsets: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    const pending = nudgeRef.current;
    const base = pending?.id === element.id ? pending.box : boxOf(element);
    const next = clampBox({ ...base, x: base.x + offset[0], y: base.y + offset[1] });
    nudgeRef.current = { id: element.id, box: next };
    onMove(element.id, next);
  }

  return (
    <div
      ref={frameRef}
      className="relative touch-none shadow-sm select-none"
      style={frameStyle(slide, theme, `min(100%, ${FRAME_WIDTH}px)`)}
    >
      {slide.elements.map((element) => {
        const selected = element.id === selectedId;
        const box = draft?.id === element.id ? draft.box : boxOf(element);
        return (
          <div
            key={element.id}
            role="button"
            tabIndex={0}
            aria-label={`${element.role ?? element.type} element`}
            aria-pressed={selected}
            onPointerDown={(event) => startDrag(event, element, "move")}
            onPointerMove={continueDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(element.id);
                return;
              }
              if (selected) nudge(event, element);
            }}
            className={`absolute cursor-move overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              selected ? "ring-2 ring-accent" : "hover:ring-1 hover:ring-accent/40"
            }`}
            style={elementStyle(element, theme, FRAME_WIDTH, box)}
          >
            <ElementContent element={element} />
            {selected
              ? RESIZE_HANDLES.map(({ handle, label, position, cursor }) => (
                  <span
                    key={handle}
                    role="slider"
                    tabIndex={-1}
                    aria-label={`Resize ${label}`}
                    aria-valuenow={handle.includes("e") || handle.includes("w") ? box.width : box.height}
                    aria-valuemin={MIN_SIZE}
                    aria-valuemax={CANVAS_WIDTH}
                    onPointerDown={(event) => startDrag(event, element, handle)}
                    onPointerMove={continueDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    className={`absolute block size-3 rounded-full border border-white bg-accent ${position}`}
                    style={{ cursor }}
                  />
                ))
              : null}
          </div>
        );
      })}
    </div>
  );
}
