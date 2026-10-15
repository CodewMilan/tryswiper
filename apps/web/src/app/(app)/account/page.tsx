"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PageIntro } from "@/components/page-intro";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AccountPage() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function remove(event: FormEvent) {
    event.preventDefault();
    if (busy || confirmation !== "DELETE") return;
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/v1/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation }) });
      const body = await response.json() as { deleted?: boolean; billing_followup_pending?: boolean; message?: string };
      if (!response.ok || !body.deleted) throw new Error(body.message ?? "Deletion could not be completed. Contact support before retrying.");
      for (const kind of ["sessionStorage", "localStorage"] as const) {
        try { const storage = window[kind]; for (const key of Object.keys(storage)) if (key.startsWith("swiper")) storage.removeItem(key); } catch { /* Storage may be unavailable. */ }
      }
      window.location.replace(`/account-deleted${body.billing_followup_pending ? "?billing=pending" : ""}`);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not delete your account. Contact support."); setBusy(false); }
  }
  return <main id="main-content" className="mx-auto w-full max-w-[800px] px-6 py-12">
    <PageIntro title="Your account">Manage your subscription or permanently remove your Swiper account.</PageIntro>
    <section className="mt-8 rounded-[24px] border border-border bg-card p-6 sm:p-8"><h2 className="text-xl font-medium">Subscription and support</h2><div className="mt-4 flex flex-wrap gap-x-6"><Link href="/pricing" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Manage billing</Link><Link href="/support" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Contact support</Link></div></section>
    <section className="mt-6 rounded-[24px] border border-border bg-card p-6 sm:p-8"><h2 className="text-xl font-medium">Delete account</h2><p className="mt-3 text-sm leading-7 text-ink-soft">This immediately erases carousels, edit history, uploaded images, saved formats and brand settings from every workspace you own. Members of those workspaces lose access. You leave workspaces owned by other people; their content is preserved.</p><p className="mt-3 text-sm leading-7 text-ink-soft">Swiper requests cancellation of subscriptions linked to your deleted workspaces. If the payment provider is unavailable, cancellation stays pending for retry and support follow-up. Deletion does not issue a refund.</p><p className="mt-3 text-sm leading-7 text-ink-soft">There is no recovery period in Swiper. Download anything you need first. Files you have already downloaded and recovery copies on other devices are outside this deletion. Minimal identity records prevent a deleted account from being restored by an old sign-in.</p><Button variant="destructive" className="mt-5" onClick={() => { setConfirmation(""); setError(null); setOpen(true); }}>Delete my account</Button></section>
    <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }} title="Permanently delete your account?" description="All content in workspaces you own will be erased immediately, including shared workspaces. This cannot be undone."><form onSubmit={(event) => void remove(event)} className="space-y-4"><div className="space-y-2"><Label htmlFor="delete-confirmation">Type DELETE to confirm</Label><Input id="delete-confirmation" autoComplete="off" disabled={busy} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div>{error ? <p role="alert" className="text-sm text-destructive">{error} <Link href="/support" className="underline">Get help</Link>.</p> : null}<div className="flex flex-wrap gap-3"><Button type="submit" variant="destructive" disabled={busy || confirmation !== "DELETE"}>{busy ? "Deleting…" : "Permanently delete account"}</Button><Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>Keep my account</Button></div></form></Dialog>
  </main>;
}
