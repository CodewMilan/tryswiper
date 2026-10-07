"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { SignOutButton } from "@/components/sign-out-button";

const menuLinkClass =
  "block rounded-xl px-3 py-2 text-sm font-light text-black motion-safe:transition-colors motion-safe:duration-150 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AccountMenu({
  links = [],
  fallbackClassName,
  className,
  tone = "dark",
}: {
  links?: { href: string; label: string }[];
  fallbackClassName?: string;
  className?: string;
  tone?: "dark" | "light";
}) {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!isLoaded || !isSignedIn || !user) {
    return fallbackClassName ? <SignOutButton className={fallbackClassName} /> : null;
  }

  const name = user.fullName || user.primaryEmailAddress?.emailAddress || "Account";
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        aria-label={name}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`ml-0.5 inline-flex size-9 items-center justify-center overflow-hidden rounded-full ring-1 focus-visible:outline-none focus-visible:ring-2 ${tone === "light" ? "bg-black text-white ring-black/20 focus-visible:ring-ring" : "bg-white/15 text-white ring-white/40 focus-visible:ring-white/80"}`}
        onClick={() => setOpen((value) => !value)}
      >
        {user.imageUrl ? (
          // Clerk hosts the Google or GitHub photo. It is not a local image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <span className="text-[13px] font-medium">{initial}</span>
        )}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-56 rounded-2xl border border-black/10 bg-white p-1.5 text-black shadow-lg"
        >
          <p className="truncate px-3 py-2 text-sm font-medium tracking-[-0.01em]">{name}</p>
          {links.map((link) => (
            <Link key={link.href} href={link.href} role="menuitem" className={menuLinkClass} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            className={`${menuLinkClass} w-full text-left`}
            onClick={() => {
              void clerk.signOut({ redirectUrl: "/" });
            }}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
