"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { AccountMenu } from "@/components/account-menu";
import { Mark } from "@/components/mark";
import { Magnetic } from "@/components/motion/magnetic";

const guestLinks = [
  { href: "/guide", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/connect", label: "Connect" },
  { href: "/login", label: "Sign in" },
];

const memberLinks = [
  { href: "/library", label: "Library" },
  { href: "/brand", label: "Brand" },
  { href: "/connect", label: "Connect" },
  { href: "/pricing", label: "Pricing" },
  { href: "/guide", label: "Guide" },
];

const navLinkClass =
  "inline-flex h-9 items-center rounded-lg px-3 text-[14px] font-light tracking-[-0.01em] text-white/90 motion-safe:transition-colors motion-safe:duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80";

const newButtonClass =
  "ml-1 inline-flex h-9 items-center rounded-xl bg-white px-3.5 text-[13px] font-medium tracking-[-0.01em] text-black motion-safe:transition-transform motion-safe:duration-150 hover:scale-[1.03] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80";

type Mode = "guest" | "member" | "pending";

export function SiteNav({ initialMode, hideSignIn = false, hideStartForFree = false }: { initialMode?: Mode; hideSignIn?: boolean; hideStartForFree?: boolean } = {}) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return <NavBar mode={initialMode ?? "guest"} hideSignIn={hideSignIn} hideStartForFree={hideStartForFree} />;
  return <ClerkNav initialMode={initialMode} hideSignIn={hideSignIn} hideStartForFree={hideStartForFree} />;
}

function ClerkNav({ initialMode, hideSignIn, hideStartForFree }: { initialMode?: Mode; hideSignIn: boolean; hideStartForFree: boolean }) {
  const { isLoaded, isSignedIn } = useUser();
  const mode: Mode = !isLoaded ? (initialMode ?? "pending") : isSignedIn ? "member" : "guest";
  return <NavBar mode={mode} hideSignIn={hideSignIn} hideStartForFree={hideStartForFree} />;
}

function NavBar({ mode, hideSignIn, hideStartForFree }: { mode: Mode; hideSignIn: boolean; hideStartForFree: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const reduced = useReducedMotion();
  const links = mode === "member" ? memberLinks : guestLinks.filter((item) => (mode === "guest" || item.href !== "/login") && (!hideSignIn || item.href !== "/login"));

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
          {links.map((item) => (
            <Link key={item.href} href={item.href} className={navLinkClass}>
              {item.label}
            </Link>
          ))}
        </nav>
        {mode === "member" ? (
          <Magnetic strength={0.16}>
            <Link href="/new" className={`${newButtonClass} hidden md:inline-flex`}>
              New
            </Link>
          </Magnetic>
        ) : null}
        {mode === "guest" && !hideStartForFree ? (
          <Magnetic strength={0.16}>
            <Link href="/signup" className={newButtonClass}>
              Start for free
            </Link>
          </Magnetic>
        ) : null}
        {mode === "pending" ? <span className="ml-1 size-9 rounded-full bg-white/15" aria-hidden /> : null}
        {mode === "member" ? <AccountMenu className="hidden md:block" links={[{ href: "/pricing", label: "Pricing" }]} /> : null}
        {mode === "member" ? <AccountMenu className="md:hidden" links={[...memberLinks, { href: "/new", label: "New carousel" }]} /> : null}
        {mode !== "member" ? (
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-xl text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 md:hidden"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((value) => !value)}
        >
          <span className="relative flex h-3.5 w-4 flex-col justify-between">
            <span
              className={`h-px w-full bg-white motion-safe:transition-transform motion-safe:duration-150 ${mobileOpen ? "translate-y-[6px] rotate-45" : ""}`}
            />
            <span
              className={`h-px w-full bg-white motion-safe:transition-opacity motion-safe:duration-150 ${mobileOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`h-px w-full bg-white motion-safe:transition-transform motion-safe:duration-150 ${mobileOpen ? "-translate-y-[6px] -rotate-45" : ""}`}
            />
          </span>
        </button>
        ) : null}
      </div>
      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="pointer-events-auto absolute inset-x-3 top-14 rounded-2xl border border-black/10 bg-white p-2 shadow-lg md:hidden"
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: 6 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            {(mode === "member" ? [...memberLinks, { href: "/new", label: "New" }] : links).map((item) => (
              <Link
                key={item.label + item.href}
                href={item.href}
                className="block rounded-xl px-3 py-3 text-sm font-light motion-safe:transition-colors motion-safe:duration-150 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
