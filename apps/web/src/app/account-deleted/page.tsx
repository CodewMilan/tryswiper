import Link from "next/link";

export const metadata = { title: "Account deleted — Swiper", robots: { index: false, follow: false } };
export default async function AccountDeletedPage({ searchParams }: { searchParams: Promise<{ billing?: string }> }) {
  const pending = (await searchParams).billing === "pending";
  return <main id="main-content" className="mx-auto max-w-xl px-6 py-24"><h1 className="text-4xl font-light tracking-tight">Your account has been deleted.</h1><p className="mt-5 leading-7 text-ink-soft">Content in your owned Swiper workspaces has been erased from the application. There is no recovery period.</p>{pending ? <p role="alert" className="mt-5 rounded-2xl border border-border p-5 text-sm leading-7">Your subscription cancellation needs follow-up. Contact support to confirm billing has stopped; your content has already been erased.</p> : null}<div className="mt-6 flex flex-wrap gap-x-6"><Link href="/" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Return to Swiper</Link><Link href="/support" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Contact support</Link></div></main>;
}
