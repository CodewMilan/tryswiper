"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FadeUp, SoftBlurIn } from "@/components/motion/soft-blur-in";

export function PageIntro({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <header>
      <h1 className="text-[36px] font-light leading-[1.05] tracking-[-0.03em] text-black sm:text-[44px]">
        <SoftBlurIn segments={[{ text: title }]} />
      </h1>
      {children ? (
        <p className="mt-3 max-w-xl text-[16px] font-light leading-6 text-ink-soft">{children}</p>
      ) : null}
    </header>
  );
}

/** Settles a block a few pixels after first paint. Content stays opaque. */
export function Settle({ children, className }: { children: ReactNode; className?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setShow(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return (
    <FadeUp show={show} className={className}>
      {children}
    </FadeUp>
  );
}
