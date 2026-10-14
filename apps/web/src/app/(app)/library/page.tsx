"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Plus, Trash, MagnifyingGlass } from "@phosphor-icons/react";
import { getFormat, type Slide, type Theme } from "@swiper/schema";
import { SlidePreview } from "@/components/editor/slide-frame";
import { WorkspaceJourney } from "@/components/workspace-journey";
import { Input } from "@/components/ui/input";
import { PageIntro, Settle } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { MonthlyAllowance } from "@/components/monthly-allowance";
import { useWorkspaceUsage } from "@/lib/use-workspace-usage";

type CarouselRow = {
  id: string;
  title: string;
  status: string;
  format_id: string;
  updated_at: string;
  slide_count: number;
  preview?: { slide: Slide; theme: Theme };
};

export default function LibraryPage() {
  const workspaceUsage = useWorkspaceUsage();
  const [items, setItems] = useState<CarouselRow[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<CarouselRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loadingPage, setLoadingPage] = useState(false);
  const visibleItems = items.filter((item) => `${item.title} ${getFormat(item.format_id)?.name ?? item.format_id}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => sort === "title" ? a.title.localeCompare(b.title) : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

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
      void workspaceUsage.refresh();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Could not delete the carousel. Try again.");
    } finally {
      setDeleting(false);
    }
  }

  const load = useCallback(async (offset = 0, signal?: AbortSignal) => {
    setState((state) => state === "ready" ? state : "loading");
    setLoadingPage(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/projects?offset=${offset}&q=${encodeURIComponent(query)}&sort=${sort}`, { signal });
      const body = (await response.json()) as { carousels?: CarouselRow[]; message?: string; next_offset?: number | null };
      if (!response.ok) throw new Error(body.message ?? "Could not load your carousels.");
      setItems((previous) => offset ? [...previous, ...(body.carousels ?? []).filter((item) => !previous.some((prior) => prior.id === item.id))] : body.carousels ?? []);
      setNextOffset(body.next_offset ?? null);
      setState("ready");
    } catch (loadError) {
      if (loadError instanceof Error && loadError.name === "AbortError") return;
      setError(loadError instanceof Error ? loadError.message : "Could not load your carousels.");
      setState("error");
    } finally { setLoadingPage(false); }
  }, [query, sort]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => { void load(0, controller.signal); }, query ? 250 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [load, query]);

  return (
    <main id="main-content" className="mx-auto w-full max-w-[1100px] px-6 py-12">
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

      {state === "ready" ? <WorkspaceJourney hasCarousels={items.length > 0} /> : null}
      <MonthlyAllowance workspace={workspaceUsage} />
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
        <>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-medium tracking-tight">Saved carousels <span className="ml-2 text-sm font-normal text-ink-soft">{items.length}</span></h2>
          <div className="flex w-full flex-wrap gap-3 sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:w-64"><MagnifyingGlass aria-hidden size={18} className="absolute left-3 top-3 text-ink-soft" /><Input aria-label="Search carousels" placeholder="Search by title or format" className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
            <select aria-label="Sort carousels" className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm" value={sort} onChange={(event) => setSort(event.target.value)}><option value="recent">Recently edited</option><option value="title">Title A–Z</option></select>
          </div>
        </div>
        <p role="status" className="mt-3 text-sm text-ink-soft">{query.trim() ? `${visibleItems.length} matching ${visibleItems.length === 1 ? "carousel" : "carousels"}` : "Open a draft to continue editing."}</p>
        {visibleItems.length === 0 ? <div className="mt-5 rounded-[24px] border border-dashed border-border bg-card p-8"><h3 className="text-lg font-medium">No matching carousels</h3><p className="mt-2 text-sm text-ink-soft">Try a different title or clear your search.</p><Button variant="outline" className="mt-4" onClick={() => setQuery("")}>Clear search</Button></div> : null}
        <Settle className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item) => (
            <article
              key={item.id}
              className="group min-h-44 rounded-[24px] border border-black/8 bg-white motion-safe:transition-[transform,border-color] hover:-translate-y-0.5 hover:border-black/20"
            >
              <Link href={`/c/${item.id}`} className="block rounded-[24px] p-6 pb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div aria-hidden className="mb-5 flex h-44 items-center justify-center overflow-hidden rounded-2xl bg-secondary">
                  {item.preview ? <span className="pointer-events-none translate-y-6"><SlidePreview slide={item.preview.slide} theme={item.preview.theme} width={140} /></span> : <span className="text-sm text-ink-soft">Preview unavailable</span>}
                </div>
                <div className="flex items-center justify-between gap-3 text-xs text-ink-soft"><span>{item.slide_count} slides</span><span className="rounded-md bg-secondary px-2 py-1 capitalize">{item.status === "published" ? "Files prepared" : item.status.replaceAll("_", " ")}</span></div>
                <h3 className="mt-3 text-lg font-medium tracking-[-0.025em] text-black">{item.title}</h3>
                <div className="mt-4 flex items-center justify-between gap-3 text-xs text-ink-soft">
                  <span>{getFormat(item.format_id)?.name ?? "Saved format"}</span>
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
        {nextOffset !== null ? <Button className="mt-6" variant="outline" disabled={loadingPage} onClick={() => void load(nextOffset)}>{loadingPage ? "Loading…" : "Load more carousels"}</Button> : null}
        </>
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
