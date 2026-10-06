import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountMenu } from "@/components/account-menu";
import { Mark } from "@/components/mark";
import { getSessionUser } from "@/lib/session";

const itemClass =
  "inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-lg px-2.5 text-[13px] font-light tracking-[-0.01em] text-white/90 motion-safe:transition-colors motion-safe:duration-150 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:px-3 sm:text-[14px]";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSessionUser();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="hero-grid flex min-h-full flex-col">
      <header className="px-3 pt-4">
        <div className="mx-auto flex w-fit max-w-full items-center gap-1 rounded-2xl border border-nav-border bg-nav p-[5px] shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]">
          <Link
            href="/connect"
            className="inline-flex items-center gap-2 rounded-xl pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            <Mark />
            <span className="text-[15px] font-medium tracking-[-0.03em] text-white">Swiper</span>
          </Link>
          <nav className="flex items-center" aria-label="Workspace">
            <Link href="/new" className={itemClass}>
              New
            </Link>
            <Link href="/brand" className={itemClass}>
              Brand
            </Link>
            <Link href="/connect" className={itemClass}>
              Connect
            </Link>
            <AccountMenu links={[{ href: "/pricing", label: "Pricing" }]} fallbackClassName={itemClass} />
          </nav>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
