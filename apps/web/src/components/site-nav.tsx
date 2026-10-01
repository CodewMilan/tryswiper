"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "@/components/icons";
import { Mark } from "@/components/mark";

const productLinks = [
  { href: "/#editor", label: "Editor" },
  { href: "/#formats", label: "Formats" },
  { href: "/#brand", label: "Brand kit" },
  { href: "/#export", label: "Export" },
];

const agentLinks = [
  { href: "/#agents", label: "Cursor" },
  { href: "/#agents", label: "Claude" },
  { href: "/#agents", label: "ChatGPT" },
];

function Menu({
  label,
  items,
}: {
  label: string;
  items: { href: string; label: string }[];
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        aria-haspopup="menu"
        className="inline-flex h-9 items-center gap-0.5 rounded-lg px-3 text-[14px] font-light tracking-[-0.01em] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
      >
        {label}
        <ChevronDown className="group-hover:rotate-180 group-focus-within:rotate-180" />
      </button>
      <div className="invisible absolute left-0 top-full z-20 min-w-44 pt-2 opacity-0 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <div role="menu" className="rounded-2xl border border-black/10 bg-white p-1.5 text-black shadow-lg">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              role="menuitem"
              className="block rounded-xl px-3 py-2 text-sm font-light text-black hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SiteNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-40 flex justify-center px-3">
      <div className="pointer-events-auto flex max-w-full items-center gap-1 rounded-2xl border border-nav-border bg-nav p-[5px] shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]">
        <Link
          href="/"
          aria-label="Swiper home"
          className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        >
          <Mark />
        </Link>
        <nav className="hidden items-center md:flex" aria-label="Primary">
          <Menu label="Product" items={productLinks} />
          <Link
            href="/#formats"
            className="inline-flex h-9 items-center rounded-lg px-3 text-[14px] font-light tracking-[-0.01em] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            Formats
          </Link>
          <Menu label="Agents" items={agentLinks} />
          <Link
            href="/#agents"
            className="inline-flex h-9 items-center rounded-lg px-3 text-[14px] font-light tracking-[-0.01em] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            Connect
          </Link>
          <Link
            href="/login"
            className="inline-flex h-9 items-center rounded-lg px-3 text-[14px] font-light tracking-[-0.01em] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            Sign in
          </Link>
        </nav>
        <Link
          href="/signup"
          className="ml-1 inline-flex h-9 items-center rounded-xl bg-white px-3.5 text-[13px] font-medium tracking-[-0.01em] text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        >
          Start for free
        </Link>
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-xl text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 md:hidden"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((value) => !value)}
        >
          <span className="flex w-4 flex-col gap-1">
            <span className="h-px w-full bg-white" />
            <span className="h-px w-full bg-white" />
            <span className="h-px w-full bg-white" />
          </span>
        </button>
      </div>
      {mobileOpen ? (
        <div className="pointer-events-auto absolute inset-x-3 top-14 rounded-2xl border border-black/10 bg-white p-2 shadow-lg md:hidden">
          {[...productLinks, ...agentLinks, { href: "/login", label: "Sign in" }].map((item) => (
            <Link
              key={item.label + item.href}
              href={item.href}
              className="block rounded-xl px-3 py-3 text-sm font-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </header>
  );
}
