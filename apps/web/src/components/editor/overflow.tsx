"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { DotsThree, Files, FloppyDisk } from "@phosphor-icons/react";
import { AccountMenu } from "@/components/account-menu";
import { Button } from "@/components/ui/button";

const optionClass = "flex min-h-10 w-full items-center gap-2 rounded-[14px] px-3 py-2 text-left text-sm font-light hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function EditorOverflow({ onSaveFormat, onPrepareFiles }: {
  onSaveFormat: () => void;
  onPrepareFiles: () => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0" onBlur={(event) => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
    }}>
      <Button ref={triggerRef} variant="outline" className="size-10 px-0" aria-label="More carousel options" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}>
        <DotsThree size={20} weight="bold" aria-hidden />
      </Button>
      {open ? (
        <section id={panelId} aria-label="Carousel options" className="absolute right-0 top-full z-40 mt-3 w-64 rounded-[24px] border border-black/10 bg-white p-3 text-black">
          <button type="button" className={optionClass} onClick={() => { setOpen(false); onSaveFormat(); }}><FloppyDisk size={16} aria-hidden />Save as format</button>
          <button type="button" className={optionClass} aria-label="Prepare files" title="Pro file handoff · Does not post to social accounts" onClick={() => { setOpen(false); onPrepareFiles(); }}><Files size={16} aria-hidden />Prepare files<span className="ml-auto text-xs text-ink-soft">Pro</span></button>
          <nav aria-label="Workspace shortcuts" className="my-2 border-t border-black/8 pt-2">
            {[{ href: "/new", label: "New carousel" }, { href: "/brand", label: "Brand" }, { href: "/connect", label: "Connect" }, { href: "/pricing", label: "Pricing" }].map((link) => (
              <Link key={link.href} href={link.href} className={optionClass} onClick={() => setOpen(false)}>{link.label}</Link>
            ))}
          </nav>
          <div className="flex min-h-10 items-center justify-between border-t border-black/8 px-3 pt-2">
            <span className="text-sm text-ink-soft">Account</span>
            <AccountMenu tone="light" fallbackClassName="rounded-[14px]" />
          </div>
        </section>
      ) : null}
    </div>
  );
}
