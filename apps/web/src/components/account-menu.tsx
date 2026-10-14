"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { SignOutButton } from "@/components/sign-out-button";
import { useAuthRuntime, useFixtureAccount } from "@/components/auth-runtime";

type AccountMenuProps = {
  links?: { href: string; label: string }[];
  fallbackClassName?: string;
  className?: string;
  tone?: "dark" | "light";
};

export function AccountMenu(props: AccountMenuProps) {
  const router = useRouter();
  const authEnabled = useAuthRuntime();
  const fixtureAccount = useFixtureAccount();
  if (fixtureAccount) return <AccountMenuView {...props} name={fixtureAccount} onSignOut={async () => { await fetch("/api/auth/sign-out", { method: "POST" }); router.push("/"); router.refresh(); }} />;
  if (!authEnabled) return null;
  return <ClerkAccountMenu {...props} />;
}

const menuLinkClass =
  "block rounded-xl px-3 py-2 text-sm font-light text-black motion-safe:transition-colors motion-safe:duration-150 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function ClerkAccountMenu(props: AccountMenuProps) {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();
  if (!isLoaded || !isSignedIn || !user) return props.fallbackClassName ? <SignOutButton className={props.fallbackClassName} /> : null;
  return <AccountMenuView {...props} name={user.fullName || user.primaryEmailAddress?.emailAddress || "Account"} imageUrl={user.imageUrl} onSignOut={() => clerk.signOut({ redirectUrl: "/" })} />;
}

function AccountMenuView({ links = [], className, tone = "dark", name, imageUrl, onSignOut }: AccountMenuProps & {
  name: string; imageUrl?: string; onSignOut: () => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const startAtEnd = useRef(false);
  const menuId = useId();
  const items = () => Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  const close = (restoreFocus = false) => { setOpen(false); if (restoreFocus) triggerRef.current?.focus(); };

  useEffect(() => {
    if (!open) return;
    const entries = rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    entries?.[startAtEnd.current ? entries.length - 1 : 0]?.focus();
    function onPointerDown(event: PointerEvent) { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return <div ref={rootRef} className={`relative ${className ?? ""}`} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <button ref={triggerRef} type="button" aria-label={name} aria-haspopup="menu" aria-expanded={open} aria-controls={menuId}
      className={`ml-0.5 inline-flex size-11 items-center justify-center overflow-hidden rounded-full ring-1 focus-visible:outline-none focus-visible:ring-2 ${tone === "light" ? "bg-black text-white ring-black/20 focus-visible:ring-ring" : "bg-white/15 text-white ring-white/40 focus-visible:ring-white/80"}`}
      onClick={() => { startAtEnd.current = false; setOpen((value) => !value); }} onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); startAtEnd.current = event.key === "ArrowUp"; setOpen(true); }
      }}>
      {imageUrl ? (
        // Clerk hosts profile images; preserve their original URL.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="size-full object-cover" />
      ) : <span className="text-[13px] font-medium">{name.slice(0, 1).toUpperCase()}</span>}
    </button>
    {open ? <div id={menuId} role="menu" aria-label="Account actions" className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-black/10 bg-white p-1.5 text-black shadow-lg" onKeyDown={(event) => {
      const entries = items();
      const index = entries.indexOf(document.activeElement as HTMLElement);
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(true); }
      else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? entries.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + entries.length) % entries.length;
        entries[next]?.focus();
      }
    }}>
      <p className="truncate px-3 py-2 text-sm font-medium tracking-[-0.01em]">{name}</p>
      {links.map((link) => <Link key={link.href} href={link.href} role="menuitem" tabIndex={-1} className={menuLinkClass} onClick={() => close()}>{link.label}</Link>)}
      <a href="mailto:milan@cassettelabs.in" role="menuitem" tabIndex={-1} className={menuLinkClass} onClick={() => close()}>Contact support</a>
      <button type="button" role="menuitem" tabIndex={-1} className={`${menuLinkClass} w-full text-left`} onClick={() => { close(); void onSignOut(); }}>Sign out</button>
    </div> : null}
  </div>;
}
