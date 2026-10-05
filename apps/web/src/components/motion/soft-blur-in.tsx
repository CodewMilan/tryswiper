"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Segment = { text: string; accent?: boolean };
type Word = { key: string; text: string; accent: boolean; space: boolean; index: number };

function timeWords(
  words: Array<{ key: string; text: string; accent: boolean; space: boolean }>,
): Word[] {
  let next = 0;
  return words.map((word) => {
    if (word.space) return { ...word, index: 0 };
    const index = next;
    next += 1;
    return { ...word, index };
  });
}

/** Word stagger. Text stays opaque so the first paint is never a blank headline. */
export function SoftBlurIn({
  segments,
  className,
  delay = 0,
}: {
  segments: Segment[];
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const words = timeWords(
    segments.flatMap((segment, segmentIndex) =>
      segment.text.split(/(\s+)/).map((part, partIndex) => ({
        key: `${segmentIndex}-${partIndex}`,
        text: part,
        accent: Boolean(segment.accent),
        space: /^\s+$/.test(part),
      })),
    ),
  );

  return (
    <span className={cn("inline", className)}>
      {words.map((word) => {
        if (word.space) {
          return <span key={word.key}>{word.text}</span>;
        }
        return (
          <span
            key={word.key}
            className={cn(word.accent && "text-accent", !reduced && "hero-word")}
            style={reduced ? undefined : { animationDelay: `${delay + word.index * 0.045}s` }}
          >
            {word.text}
          </span>
        );
      })}
    </span>
  );
}

export function FadeUp({
  children,
  show,
  className,
  y = 12,
}: {
  children: ReactNode;
  show: boolean;
  className?: string;
  y?: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      initial={false}
      animate={{ y: show ? 0 : y }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
    >
      {children}
    </motion.div>
  );
}
