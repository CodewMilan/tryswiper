"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type UsageKind = "carousel" | "generation" | "export" | "publish";
export type WorkspaceUsage = {
  plan: "free" | "pro";
  usage: Partial<Record<UsageKind, number>>;
  limits: Record<UsageKind, number> & { jpg: boolean };
};

export type UsageApiError = {
  message?: string;
  code?: string;
  details?: { kind?: UsageKind; limit?: number; plan?: "free" | "pro" };
};

export function usageLimitMessage(error: UsageApiError) {
  const names: Record<UsageKind, string> = {
    carousel: "carousels", generation: "AI generations", export: "exports", publish: "file preparations",
  };
  const kind = error.details?.kind;
  const allowance = error.details?.limit;
  const plan = error.details?.plan === "pro" ? "Pro" : "Free";
  return kind
    ? `You’ve used ${allowance === undefined ? "all your" : `all ${allowance}`} ${names[kind]} for this month on ${plan}. Your allowance resets on the first of next month (UTC).${kind === "carousel" ? " Deleting a carousel created this month frees a slot." : ""}`
    : "You’ve reached your monthly allowance. It resets on the first of next month (UTC).";
}

export function useWorkspaceUsage() {
  const [data, setData] = useState<WorkspaceUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/billing", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load your plan and monthly allowance.");
      const body = await response.json() as WorkspaceUsage;
      if (version === requestVersion.current) setData(body);
    } catch {
      if (version === requestVersion.current) {
        setData(null);
        setError("Could not load your plan and monthly allowance. Try again.");
      }
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Synchronize the client with its authenticated billing resource.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      requestVersion.current++;
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return { data, loading, error, refresh };
}
