"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main id="main-content" className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-16">
    <p className="text-sm text-ink-soft">Something went wrong</p><h1 className="mt-3 text-3xl font-medium tracking-tight">This page couldn’t load</h1><p className="mt-3 text-sm leading-6 text-ink-soft">Try loading the page again. You can return to your library to find your saved carousels.</p><div className="mt-6 flex flex-wrap gap-3"><Button onClick={() => retry()}>Try again</Button><Link href="/library" className="inline-flex min-h-11 items-center rounded-xl border border-border bg-card px-4 text-sm font-medium">Open library</Link></div>
  </main>;
}
