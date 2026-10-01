import type { ReactNode } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { auth } from "@/lib/auth";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <Link href="/connect" className="font-semibold tracking-tight">
          Swiper
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/connect"
            className="inline-flex min-h-10 items-center rounded-md px-3 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Connect
          </Link>
          <Link
            href="/brand"
            className="inline-flex min-h-10 items-center rounded-md px-3 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Brand
          </Link>
          <SignOutButton />
        </nav>
      </header>
      {children}
    </div>
  );
}
