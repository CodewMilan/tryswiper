"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Plus, Trash } from "@phosphor-icons/react";
import { PageIntro, Settle } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type CarouselRow = {
  id: string;
  title: string;
  status: string;
  format_id: string;
  updated_at: string;
};

export default function LibraryPage() {
  const [items, setItems] = useState<CarouselRow[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<CarouselRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function confirmDelete() {
    if (!deletingItem || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/v1/carousels/${deletingItem.id}`, { method: "DELETE" });
      const body = await response.json() as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Could not delete the carousel. Try again.");
      setItems((current) => current.filter((item) => item.id !== deletingItem.id));
      setNotice(`“${deletingItem.title}” was deleted.`);
      setDeletingItem(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Could not delete the carousel. Try again.");
    } finally {
      setDeleting(false);
    }
  }

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const response = await fetch("/api/v1/projects");
      const body = (await response.json()) as { carousels?: CarouselRow[]; message?: string };
      if (!response.ok) throw new Error(body.message ?? "Could not load your carousels.");
      setItems(body.carousels ?? []);
      setState("ready");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load your carousels.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    // Synchronize this client view with its authenticated API resource.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <main className="mx-auto w-full max-w-[1100px] px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <PageIntro title="Your carousels">
          Start from a brief, return to a draft, or polish something your agent created.
        </PageIntro>
        <Link
          href="/new"
          className="inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-black px-4 text-sm font-medium text-white motion-safe:transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Plus size={16} /> New carousel
        </Link>
      </div>

      {notice ? <p role="status" className="mt-6 text-sm text-ink-soft">{notice}</p> : null}

      {state === "loading" ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2" aria-busy="true" aria-label="Loading carousels">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-44 animate-pulse rounded-[24px] bg-white" />
          ))}
        </div>
      ) : null}

      {state === "error" ? (
        <section className="mt-10 max-w-xl rounded-[24px] border border-black/8 bg-white p-6" role="alert">
          <h2 className="text-lg font-medium">Your library did not load</h2>
          <p className="mt-2 text-sm text-destructive">{error}</p>
          <Button className="mt-5" variant="outline" onClick={() => void load()}>Try again</Button>
        </section>
      ) : null}

      {state === "ready" && items.length === 0 ? (
        <Settle className="mt-10 overflow-hidden rounded-[28px] border border-black/8 bg-white p-7 sm:p-10">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">First draft</p>
          <h2 className="mt-4 max-w-xl text-3xl font-light tracking-[-0.03em]">Turn one sentence into an editable carousel.</h2>
          <p className="mt-3 max-w-lg text-[15px] font-light leading-6 text-ink-soft">
            Describe the post, choose a story shape, and review every line before you export.
          </p>
          <Link href="/new" className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Create your first carousel <ArrowRight size={16} />
          </Link>
        </Settle>
      ) : null}

      {state === "ready" && items.length > 0 ? (
        <Settle className="mt-10 grid gap-4 sm:grid-cols-2">
          {items.map((item, index) => (
            <article
              key={item.id}
              className="group min-h-44 rounded-[24px] border border-black/8 bg-white motion-safe:transition-[transform,border-color] hover:-translate-y-0.5 hover:border-black/20"
            >
              <Link href={`/c/${item.id}`} className="block rounded-[24px] p-6 pb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-ink-faint">{String(index + 1).padStart(2, "0")}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">{item.status}</span>
                </div>
                <h2 className="mt-8 text-xl font-medium tracking-[-0.025em] text-black">{item.title}</h2>
                <div className="mt-4 flex items-center justify-between gap-3 text-xs text-ink-soft">
                  <span>{item.format_id.replaceAll("-", " ")}</span>
                  <span>{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(item.updated_at))}</span>
                </div>
              </Link>
              <div className="flex justify-end px-4 pb-3">
                <Button variant="ghost" size="sm" aria-label={`Delete ${item.title}`} onClick={() => {
                  setDeleteError(null);
                  setDeletingItem(item);
                }} className="text-ink-soft hover:text-destructive">
                  <Trash size={15} /> Delete
                </Button>
              </div>
            </article>
          ))}
        </Settle>
      ) : null}

      <Dialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => { if (!open && !deleting) setDeletingItem(null); }}
        title="Delete this carousel?"
        description={`“${deletingItem?.title ?? "This carousel"}” and its edit history will be permanently deleted. Saved formats stay available. Deleting a carousel created this month frees a carousel slot; AI generation and export usage stays counted.`}
      >
        {deleteError ? <p role="alert" className="mb-4 text-sm text-destructive">{deleteError}</p> : null}
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void confirmDelete()} disabled={deleting} aria-busy={deleting}>{deleting ? "Deleting…" : "Delete carousel"}</Button>
          <Button variant="outline" disabled={deleting} onClick={() => setDeletingItem(null)}>Cancel</Button>
        </div>
      </Dialog>
    </main>
  );
}
