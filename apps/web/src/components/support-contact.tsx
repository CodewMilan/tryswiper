"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SupportContact() {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText("milan@cassettelabs.in"); setCopied(true); setError(false); }
    catch { setError(true); }
  }
  return <div className="mt-5"><a href="mailto:milan@cassettelabs.in" className="break-all text-lg underline underline-offset-4">milan@cassettelabs.in</a><div className="mt-4 flex flex-wrap gap-3"><a href="mailto:milan@cassettelabs.in?subject=Swiper%20support" className="inline-flex min-h-11 items-center rounded-xl bg-black px-4 text-sm font-medium text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Email support</a><Button variant="outline" onClick={() => void copy()}>{copied ? "Email copied" : "Copy email address"}</Button></div>{copied ? <p role="status" className="mt-3 text-sm text-ink-soft">Paste the address into your email app.</p> : null}{error ? <p role="alert" className="mt-3 text-sm text-destructive">Could not copy. Select and copy the email address above.</p> : null}</div>;
}
