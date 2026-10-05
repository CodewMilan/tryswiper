"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

type Segment = { text: string; accent?: boolean };

/** 21st.dev Soft Blur In — word stagger with blur + lift. */
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
  const words = segments.flatMap((segment, segmentIndex) =>
    segment.text.split(/(\s+)/).map((part, partIndex) => ({
      key: `${segmentIndex}-${partIndex}`,
      text: part,
      accent: Boolean(segment.accent),
      space: /^\s+$/.test(part),
    })),
  );

  let wordIndex = 0;

  return (
    <span className={cn("inline", className)}>
      {words.map((word) => {
        if (word.space) {
          return <span key={word.key}>{word.text}</span>;
        }
        const index = wordIndex;
        wordIndex += 1;
        if (reduced) {
          return (
            <span key={word.key} className={word.accent ? "text-accent" : undefined}>
              {word.text}
            </span>
          );
        }
        return (
          <motion.span
            key={word.key}
            className={cn("inline-block will-change-transform", word.accent && "text-accent")}
            initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.55, delay: delay + index * 0.045, ease: EASE }}
          >
            {word.text}
          </motion.span>
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
      initial={{ opacity: 0, y }}
      animate={{ opacity: show ? 1 : 0, y: show ? 0 : y }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
    >
      {children}
    </motion.div>
  );
}
