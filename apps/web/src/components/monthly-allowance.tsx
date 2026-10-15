"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { useWorkspaceUsage } from "@/lib/use-workspace-usage";
import { planName } from "@/lib/plans";

export function MonthlyAllowance({ workspace }: { workspace: ReturnType<typeof useWorkspaceUsage> }) {
  const { data, loading, error, refresh } = workspace;
  return (
    <section aria-label="Monthly allowance" className="mt-8 rounded-[24px] border border-black/8 bg-white p-6">
      {data ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-ink-soft">{planName(data.plan)} · Remaining this month</p>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <p><span className="font-medium tabular-nums">{Math.max(0, data.limits.carousel - (data.usage.carousel ?? 0))} of {data.limits.carousel}</span> carousels remaining</p>
              <p><span className="font-medium tabular-nums">{Math.max(0, data.limits.generation - (data.usage.generation ?? 0))} of {data.limits.generation}</span> AI generations remaining</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-ink-soft">Resets on the first of each month (UTC).</p>
          </div>
          <Link href="/pricing" className="inline-flex min-h-10 items-center rounded-[14px] px-3 text-sm font-medium underline decoration-black/20 underline-offset-4 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">View plans</Link>
        </div>
      ) : loading ? (
        <div aria-busy="true" aria-label="Loading monthly allowance" className="space-y-3">
          <div className="h-4 w-48 rounded bg-secondary motion-safe:animate-pulse" />
          <div className="h-5 w-full max-w-md rounded bg-secondary motion-safe:animate-pulse" />
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="alert" className="text-sm text-ink-soft">{error}</p>
          <Button variant="outline" onClick={() => void refresh()}>Retry allowance</Button>
        </div>
      )}
    </section>
  );
}
