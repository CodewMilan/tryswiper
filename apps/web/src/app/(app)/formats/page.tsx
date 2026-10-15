"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { PageIntro } from "@/components/page-intro";
import { FormatPreview } from "@/components/format-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FormatOption } from "@/lib/formats";

const actionClass = "inline-flex min-h-11 items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export default function FormatsPage() {
  const [formats, setFormats] = useState<FormatOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<FormatOption | null>(null);
  const [remove, setRemove] = useState<FormatOption | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setLoadError(null);
    try {
      const response = await fetch("/api/v1/formats", { cache: "no-store" });
      const body = await response.json() as { formats?: FormatOption[]; message?: string };
      if (!response.ok || !body.formats) throw new Error(body.message ?? "Could not load formats.");
      setFormats(body.formats);
    } catch (error) { setLoadError(error instanceof Error ? error.message : "Could not load formats."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    // Synchronize this view with the workspace's saved formats.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function change(event?: FormEvent) {
    event?.preventDefault();
    const target = edit ?? remove;
    if (!target || busy) return;
    setBusy(true); setActionError(null);
    try {
      const response = await fetch(`/api/v1/formats/${encodeURIComponent(target.id)}`, {
        method: edit ? "PATCH" : "DELETE",
        ...(edit ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), description: description.trim() }) } : {}),
      });
      const body = await response.json() as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Could not update this format.");
      setFormats((current) => edit ? current.map((format) => format.id === target.id ? { ...format, name: name.trim(), description: description.trim() } : format) : current.filter((format) => format.id !== target.id));
      setNotice(edit ? "Format details saved." : "Format deleted. Existing carousels are unchanged.");
      setEdit(null); setRemove(null);
    } catch (error) { setActionError(error instanceof Error ? error.message : "Could not update this format."); }
    finally { setBusy(false); }
  }
  const filtered = formats.filter((format) => (filter === "all" || format.source === filter) && `${format.name} ${format.description}`.toLowerCase().includes(search.trim().toLowerCase()));

  return <main id="main-content" className="mx-auto w-full max-w-[1200px] px-6 py-12">
    <PageIntro title="Your formats">Find a story shape or reuse a design you’ve saved. Each use creates a separate, editable carousel.</PageIntro>
    <div className="mt-6 flex flex-wrap gap-x-6"><Link href="/new?mode=manual&format=freeform" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Start with a blank slide</Link><Link href="/library" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Open a carousel to save a format</Link></div>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">To save a design, open its carousel and choose More carousel options → Save as format. You can keep up to 100 saved formats; delete an unused one to make room.</p>
    <Tabs value={filter} onValueChange={setFilter}>
    <div className="mt-8 flex flex-wrap items-end justify-between gap-5">
      <TabsList aria-label="Format source"><TabsTrigger value="all">All formats</TabsTrigger><TabsTrigger value="workspace">Saved by you</TabsTrigger><TabsTrigger value="official">Swiper formats</TabsTrigger></TabsList>
      <div className="w-full space-y-2 sm:w-72"><Label htmlFor="format-search">Search formats</Label><Input id="format-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or description" /></div>
    </div>
    <TabsContent value={filter}>
    {notice ? <p role="status" className="mt-5 text-sm">{notice}</p> : null}
    {loading ? <p role="status" className="mt-8 text-sm text-ink-soft">Loading formats…</p> : loadError ? <div role="alert" className="mt-8 rounded-2xl border border-border p-6"><p>{loadError}</p><Button className="mt-4" variant="outline" onClick={() => void load()}>Try again</Button></div> : <>
      <p className="mt-6 text-sm text-ink-soft">{filtered.length} {filtered.length === 1 ? "format" : "formats"}</p>
      {filtered.length === 0 ? <section className="mt-4 rounded-[24px] border border-dashed border-border p-8"><h2 className="text-xl font-medium">{search ? "No matching formats" : "No saved formats yet"}</h2><p className="mt-3 text-sm leading-6 text-ink-soft">{search ? "Try another name or clear your search." : "Save a carousel’s design from the editor, then find it here. You can start with a Swiper format in the meantime."}</p><Button variant="outline" className="mt-4" onClick={() => { setSearch(""); setFilter("all"); }}>Show all formats</Button></section> : <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((format) => <article key={format.id} aria-label={format.name} className="flex min-w-0 flex-col rounded-[24px] border border-border bg-card p-5">
        <FormatPreview format={format} />
        <p className="mt-4 font-mono text-xs text-ink-soft">{format.source === "workspace" ? "SAVED BY YOU" : "SWIPER FORMAT"} · {format.slideCount.min === format.slideCount.max ? format.slideCount.min : `${format.slideCount.min}–${format.slideCount.max}`} slides</p>
        <h2 className="mt-2 break-words text-xl font-medium tracking-tight">{format.name}</h2><p className="mt-2 break-words text-sm leading-6 text-ink-soft">{format.description}</p>
        <p className="mt-3 text-xs leading-6 text-ink-soft">{format.roles.join(" · ")}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-5"><Link href={`/new?mode=manual&format=${encodeURIComponent(format.id)}`} className={actionClass}>Use format</Link>{format.id !== "freeform" && format.can_generate !== false ? <Link href={`/new?mode=generate&format=${encodeURIComponent(format.id)}`} className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm underline underline-offset-4">Write from a brief</Link> : null}</div>
        {format.source === "workspace" ? <div className="mt-4 flex gap-2 border-t border-border pt-3"><Button variant="ghost" onClick={() => { setActionError(null); setName(format.name); setDescription(format.description); setEdit(format); }}>Edit details</Button><Button variant="ghost" className="text-destructive" onClick={() => { setActionError(null); setRemove(format); }}>Delete</Button></div> : null}
      </article>)}</div>}
    </>}
    </TabsContent>
    </Tabs>
    <Dialog open={!!edit} onOpenChange={(open) => { if (!open && !busy) setEdit(null); }} title="Edit format details" description="Change its name and description. Its saved design and existing carousels stay the same.">
      <form onSubmit={(event) => void change(event)} className="space-y-4"><div className="space-y-2"><Label htmlFor="edit-format-name">Format name</Label><Input id="edit-format-name" autoFocus required minLength={2} maxLength={80} value={name} disabled={busy} onChange={(event) => setName(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="edit-format-description">Description</Label><Textarea id="edit-format-description" maxLength={240} value={description} disabled={busy} onChange={(event) => setDescription(event.target.value)} /></div>{actionError ? <p role="alert" className="text-sm text-destructive">{actionError}</p> : null}<div className="flex gap-3"><Button type="submit" disabled={busy || name.trim().length < 2}>{busy ? "Saving…" : "Save details"}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setEdit(null)}>Cancel</Button></div></form>
    </Dialog>
    <Dialog open={!!remove} onOpenChange={(open) => { if (!open && !busy) setRemove(null); }} title="Delete this saved format?" description={`“${remove?.name ?? "This format"}” will no longer be available for new drafts. Carousels already made from it stay editable.`}>
      {actionError ? <p role="alert" className="mb-4 text-sm text-destructive">{actionError}</p> : null}<div className="flex gap-3"><Button disabled={busy} onClick={() => void change()}>{busy ? "Deleting…" : "Delete format"}</Button><Button variant="outline" disabled={busy} onClick={() => setRemove(null)}>Keep format</Button></div>
    </Dialog>
  </main>;
}
