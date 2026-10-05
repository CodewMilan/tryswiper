"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 21st.dev Spotlight Card — a coral wash follows the cursor inside the card. */
export function SpotlightCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const [spot, setSpot] = useState({ x: 50, y: 50, on: false });

  function onMove(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setSpot({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
      on: true,
    });
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:hover:-translate-y-0.5",
        className,
      )}
      onMouseMove={onMove}
      onMouseLeave={() => setSpot((current) => ({ ...current, on: false }))}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 motion-safe:transition-opacity motion-safe:duration-300"
        style={{
          opacity: spot.on ? 1 : 0,
          background: `radial-gradient(420px circle at ${spot.x}% ${spot.y}%, rgba(239, 90, 60, 0.1), transparent 58%)`,
        }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}
