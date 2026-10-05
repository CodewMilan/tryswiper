import type { ReactNode } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Mark } from "@/components/mark";
import { SignOutButton } from "@/components/sign-out-button";
import { auth } from "@/lib/auth";

const itemClass =
  "inline-flex h-9 items-center rounded-lg px-3 text-[14px] font-light text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="px-3 pt-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-nav-border bg-nav p-[5px] shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)]">
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
            <SignOutButton className={itemClass} />
          </nav>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
