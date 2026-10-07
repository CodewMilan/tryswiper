import Link from "next/link";
import { Mark } from "@/components/mark";
import { SiteNav } from "@/components/site-nav";
import { getSessionUser } from "@/lib/session";

export const metadata = { title: "Page not found · Swiper" };

export default async function NotFound() {
  const session = await getSessionUser();
  return (
    <div className="hero-grid flex min-h-full flex-col">
      <SiteNav initialMode={session ? "member" : "guest"} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 pb-20 pt-32 text-center">
        <Mark />
        <p className="mt-8 font-mono text-xs uppercase tracking-[0.16em] text-accent">404 · Page not found</p>
        <h1 className="mt-4 text-4xl font-light tracking-[-0.04em] text-black sm:text-5xl">This page is not in the deck.</h1>
        <p className="mt-4 max-w-md text-[16px] font-light leading-7 text-ink-soft">
          The address may have changed, or the page may no longer exist.{session ? " Your carousel drafts are still safe." : " Head home or start your first carousel."}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={session ? "/library" : "/signup"} className="inline-flex min-h-11 items-center rounded-[14px] bg-black px-4 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">{session ? "Open library" : "Start for free"}</Link>
          <Link href="/" className="inline-flex min-h-11 items-center rounded-[14px] border border-black/10 bg-white px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Go home</Link>
        </div>
      </main>
    </div>
  );
}
