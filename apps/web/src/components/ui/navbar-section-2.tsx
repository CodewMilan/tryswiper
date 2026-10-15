"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { Mark } from "@/components/mark";

type Mode = "guest" | "member" | "pending";

type PanelItem = {
  title: string;
  description: string;
  href: string;
};

const productItems: PanelItem[] = [
  { title: "Editor", description: "Open the draft, change the line, and export the file you approved.", href: "/#editor" },
  { title: "Formats", description: "Problem, list, before and after, myth. Start from a shape that already works.", href: "/#formats" },
  { title: "Brand kit", description: "Name, audience, tone, and the words you will not say.", href: "/#brand" },
  { title: "Agents", description: "Mint a key and use Swiper from Cursor, Claude, or ChatGPT.", href: "/#agents" },
];

type NavLink = { href: string; label: string };

export default function NavbarSectionTwo({
  mode,
  hideSignIn = false,
  hideStartForFree = false,
  links,
  accountLinks = [],
  showNew = true,
}: {
  mode: Mode;
  hideSignIn?: boolean;
  hideStartForFree?: boolean;
  links?: NavLink[];
  accountLinks?: NavLink[];
  showNew?: boolean;
}) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLElement>(null);
  const panelId = useId();
  const [productOpen, setProductOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const showProduct = mode !== "member";
  const showStart = mode === "guest" && !hideStartForFree;
  const showSignIn = mode === "guest" && !hideSignIn;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setProductOpen(false);
      setMobileOpen(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    if (!productOpen && !mobileOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setProductOpen(false);
        setMobileOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProductOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [productOpen, mobileOpen]);

  const memberLinks: NavLink[] = [
    { href: "/library", label: "Library" },
    { href: "/brand", label: "Brand" },
    { href: "/connect", label: "Connect" },
    { href: "/pricing", label: "Pricing" },
    { href: "/guide", label: "Guide" },
  ];
  const barLinks = links ?? (mode === "member" ? memberLinks : [
        { href: "/guide", label: "How it works" },
        { href: "/connect", label: "Connect" },
        { href: "/pricing", label: "Pricing" },
        ...(showSignIn ? [{ href: "/login", label: "Sign in" }] : []),
      ]);
  const showNewCarousel = mode === "member" && showNew;

  return (
    <header ref={rootRef} className="pointer-events-none fixed inset-x-0 top-0 z-40 px-3 font-sans text-zinc-900 lg:px-6">
      <div className="pointer-events-auto relative mx-auto flex h-16 w-full max-w-7xl items-center justify-between">
        <Link href="/" aria-label="Swiper home" className="relative z-10 flex items-center text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Mark />
        </Link>

        <div className="absolute left-1/2 top-0 hidden w-[min(720px,calc(100%-15rem))] -translate-x-1/2 lg:block" style={{ filter: "drop-shadow(0 12px 20px rgba(0, 0, 0, 0.18))" }}>
          <Corner className="pointer-events-none absolute -left-[18px] top-0 z-10 text-black" />
          <Corner className="pointer-events-none absolute -right-[18px] top-0 z-10 -scale-x-100 text-black" />
          <motion.div
            animate={{ height: productOpen ? "auto" : 48 }}
            transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 28 }}
            className="relative flex w-full flex-col overflow-hidden bg-black"
            style={{ borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}
          >
            <div className="z-20 flex h-12 items-center justify-center px-4">
              <nav aria-label="Primary" className="flex w-full items-center justify-center gap-1 text-xs font-medium">
                {showProduct ? (
                  <button
                    type="button"
                    aria-expanded={productOpen}
                    aria-controls={panelId}
                    onClick={() => setProductOpen((open) => !open)}
                    className={`flex cursor-pointer items-center gap-1 rounded-md px-3 py-1 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/80 ${productOpen ? "bg-[#18181b] text-white" : "text-zinc-400"}`}
                  >
                    Product
                    <ChevronDown className={`size-3.5 opacity-70 transition-transform duration-300 ${productOpen ? "rotate-180" : ""}`} />
                  </button>
                ) : null}
                {barLinks.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`rounded-md px-2.5 py-1 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${active ? "bg-[#18181b] text-white" : "text-zinc-400"}`}>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <AnimatePresence initial={false}>
              {productOpen ? (
                <motion.div
                  id={panelId}
                  key="product"
                  initial={reduced ? false : { opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: reduced ? 0 : 0.18 }}
                  className="overflow-hidden border-t border-zinc-900 bg-black"
                >
                  <div className="grid grid-cols-4 gap-3 p-4">
                    {productItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setProductOpen(false)}
                        className="group flex min-h-[132px] flex-col justify-between rounded-xl border border-zinc-900 bg-zinc-950/40 p-4 transition-colors hover:border-zinc-800 hover:bg-zinc-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                      >
                        <span>
                          <span className="block text-sm font-medium text-white">{item.title}</span>
                          <span className="mt-1 block text-[11px] leading-4 text-zinc-500 transition-colors group-hover:text-zinc-400">{item.description}</span>
                        </span>
                        <span className="mt-4 text-[10px] font-medium text-zinc-500">
                          Explore <ArrowRight className="ml-1 inline size-3" />
                        </span>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </div>

        <div className="relative z-10 hidden items-center gap-2 lg:flex">
          {mode === "member" ? (
            <>
              {showNewCarousel ? (
                <Link href="/new" className="inline-flex items-center gap-1 rounded-lg bg-white px-3.5 py-1.5 text-[12px] font-semibold text-black transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  New carousel
                  <ArrowRight className="size-3" />
                </Link>
              ) : null}
              <AccountMenu tone="light" links={accountLinks} />
            </>
          ) : showStart ? (
            <Link href="/signup" className="inline-flex items-center gap-1 rounded-lg bg-white px-3.5 py-1.5 text-[12px] font-semibold text-black transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              Start for free
              <ArrowRight className="size-3" />
            </Link>
          ) : mode === "pending" ? (
            <span className="size-9 rounded-full bg-black/10" aria-hidden />
          ) : null}
        </div>
        <div className="relative z-10 flex items-center gap-2 lg:hidden">
          {mode === "member" ? <AccountMenu tone="light" className="mr-1" links={accountLinks} /> : null}
          {showStart ? (
            <Link href="/signup" className="inline-flex items-center gap-1 rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white">
              Start for free
              <ArrowRight className="size-3" />
            </Link>
          ) : null}
          {showNewCarousel ? (
            <Link href="/new" className="inline-flex items-center gap-1 rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white">
              New
            </Link>
          ) : null}
          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((open) => !open)}
            className="grid size-9 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {mobileOpen ? (
          <motion.div
            initial={reduced ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduced ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className="pointer-events-auto relative z-20 w-full overflow-hidden rounded-xl bg-black text-white shadow-xl lg:hidden"
          >
            <div className="grid gap-1 p-3">
              {showProduct ? (
                <div>
                  <button
                    type="button"
                    aria-expanded={productOpen}
                    onClick={() => setProductOpen((open) => !open)}
                    className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-sm text-zinc-300 hover:bg-white/10 hover:text-white"
                  >
                    Product
                    <ChevronDown className={`size-4 transition-transform ${productOpen ? "rotate-180" : ""}`} />
                  </button>
                  {productOpen ? (
                    <div className="mx-3 mb-2 grid gap-1 border-l border-white/10 pl-3">
                      {productItems.map((item) => (
                        <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 hover:bg-white/5">
                          <span className="block text-sm font-medium text-white">{item.title}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-zinc-500">{item.description}</span>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {barLinks.map((item) => (
                <Link key={item.href} href={item.href} aria-current={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "page" : undefined} onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center rounded-lg px-3 text-sm text-zinc-300 hover:bg-white/10 hover:text-white">
                  {item.label}
                </Link>
              ))}
              {showNewCarousel ? (
                <Link href="/new" onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center rounded-lg px-3 text-sm text-white hover:bg-white/10">
                  New carousel
                </Link>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

function Corner({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M20 20V0H0C11.046 0 20 8.954 20 20Z" fill="currentColor" />
    </svg>
  );
}
