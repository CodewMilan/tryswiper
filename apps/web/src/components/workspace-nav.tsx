"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/account-menu";
import { Mark } from "@/components/mark";

const links = [
  { href: "/library", label: "Library" },
  { href: "/new", label: "New" },
  { href: "/brand", label: "Brand" },
  { href: "/connect", label: "Connect" },
];

const base =
  "inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-lg px-2.5 text-[13px] font-light tracking-[-0.01em] motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:px-3 sm:text-[14px]";

export function WorkspaceNav() {
  const pathname = usePathname();

  return (
    <header className="px-3 pt-4">
      <div className="mx-auto flex w-fit max-w-full items-center gap-1 rounded-2xl border border-nav-border bg-nav p-[5px] shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]">
        <Link
          href="/library"
          aria-label="Swiper library"
          className="inline-flex items-center gap-2 rounded-xl pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        >
          <Mark />
          <span className="hidden text-[15px] font-medium tracking-[-0.03em] text-white sm:inline">Swiper</span>
        </Link>
        <nav className="flex items-center" aria-label="Workspace">
          {links.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`${base} ${active ? "bg-white text-black" : "text-white/90 hover:bg-white/10 hover:text-white"}`}
              >
                {item.label}
              </Link>
            );
          })}
          <AccountMenu links={[{ href: "/pricing", label: "Pricing" }]} fallbackClassName={`${base} text-white/90`} />
        </nav>
      </div>
    </header>
  );
}
