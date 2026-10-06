"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUUpLeft, DownloadSimple, ImageSquare, TextT, Plus, Copy, Trash, CaretLeft, CaretRight, CheckCircle, CircleNotch, FloppyDisk, Minus, CornersOut } from "@phosphor-icons/react";
import { getFormat, planFromFormat, renderPlanToCarousel, type CarouselElement } from "@swiper/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { Mark } from "@/components/mark";
import { Inspector, uploadImage, type UploadedAsset } from "./editor/inspector";
import { SlideCanvas } from "./editor/slide-canvas";
import { SlideRail } from "./editor/slide-rail";
import { clampBox, type Box } from "./editor/slide-frame";
import { useCarousel } from "./editor/use-carousel";

export function Editor({ carouselId }: { carouselId: string }) {
  const { doc, meta, undoCount, loading, loadError, saveState, saveError, setSaveError,
    reload, mutate, undo, settle, retry, conflict, discardLocal } = useCarousel(carouselId);
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const [formatName, setFormatName] = useState("");
  const [formatDescription, setFormatDescription] = useState("");
  const [formatSaving, setFormatSaving] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [availableWidth, setAvailableWidth] = useState(520);
  const stageRef = useRef<HTMLDivElement>(null);
  const addFileRef = useRef<HTMLInputElement>(null);
  const slideIndex = doc ? Math.min(index, doc.slides.length - 1) : 0;
  const slide = doc?.slides[slideIndex];
  const selected = slide?.elements.find((element) => element.id === selectedId);
  const canvasWidth = Math.round(Math.min(480, Math.max(240, availableWidth - 64)) * zoom);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setAvailableWidth(entry.contentRect.width);
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [loading]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        void undo();
      }
      if (event.key === "Escape") setSelectedId(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo]);

  function moveElement(elementId: string, box: Box, options?: { immediate?: boolean }) {
    if (slide) mutate([{ op: "set_element_box", slideId: slide.id, elementId, ...box }], options);
  }
  function selectSlide(next: number) { setIndex(next); setSelectedId(null); }
  function reorder(slideId: string, toIndex: number) {
    if (!doc) return;
    const bounded = Math.max(0, Math.min(doc.slides.length - 1, toIndex));
    mutate([{ op: "reorder_slide", slideId, toIndex: bounded }], { immediate: true });
    selectSlide(bounded);
  }
  function replaceImage(elementId: string, asset: UploadedAsset) {
    if (slide) mutate([{ op: "set_element_image", slideId: slide.id, elementId, assetId: asset.id, src: asset.url }], { immediate: true });
  }
  async function addImage(file: File) {
    if (!slide) return;
    const targetSlide = slide.id;
    setAdding(true);
    try {
      const asset = await uploadImage(file);
      const id = crypto.randomUUID();
      mutate([{ op: "add_element", slideId: targetSlide, element: {
        id, type: "image", assetId: asset.id, src: asset.url,
        ...clampBox({ x: 160, y: 420, width: 760, height: Math.round(760 * asset.height / asset.width) }),
      } }], { immediate: true });
      setSelectedId(id);
    } catch (error) { setSaveError(error instanceof Error ? error.message : "Upload failed."); }
    finally { setAdding(false); }
  }
  function addText() {
    if (!slide || !doc) return;
    const id = crypto.randomUUID();
    mutate([{ op: "add_element", slideId: slide.id, element: {
      id, type: "text", role: "body", text: "Your next thought.",
      x: 100, y: 550, width: 880, height: 180,
      style: { fontSize: 40, fontWeight: 400, align: "left", color: doc.theme.primary, lineHeight: 1.3 },
    } }], { immediate: true });
    setSelectedId(id);
  }
  function addSlide(duplicate = false) {
    if (!doc || !slide || doc.slides.length >= 12) return;
    const source = duplicate ? slide : renderPlanToCarousel(
      planFromFormat(getFormat("freeform")!, { productName: "" }), doc.theme,
    ).slides[1]!;
    const next = { ...source, id: crypto.randomUUID(), elements: source.elements.map((element) => ({ ...element, id: crypto.randomUUID() })) };
    mutate([{ op: "insert_slide", index: slideIndex + 1, slide: next }], { immediate: true });
    selectSlide(slideIndex + 1);
  }
  function downloadLocal() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "recovered-carousel.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function download(format: "png" | "pdf") {
    setExporting(format);
    setSaveError(null);
    try {
      if (!(await settle())) throw new Error("Save your latest edits before exporting. Your draft is kept on this device.");
      const response = await fetch(`/api/v1/carousels/${carouselId}/export?format=${format}`);
      if (!response.ok) {
        const body = await response.json() as { message?: string };
        throw new Error(body.message ?? "Export failed. Please try again.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ?? `carousel.${format === "pdf" ? "pdf" : "zip"}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(`${format.toUpperCase()} export downloaded.`);
      setExportOpen(false);
    } catch (error) { setSaveError(error instanceof Error ? error.message : "Export failed."); }
    finally { setExporting(null); }
  }
  async function saveFormat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (formatSaving) return;
    setFormatSaving(true); setFormatError(null);
    try {
      if (!(await settle())) throw new Error("Your edits could not be saved yet. Retry saving before creating a format.");
      const response = await fetch("/api/v1/formats", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carousel_id: carouselId, name: formatName.trim(), description: formatDescription.trim() }),
      });
      const body = await response.json() as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Could not save format.");
      setNotice(`“${formatName.trim()}” is ready in your workspace formats.`);
      setFormatOpen(false);
    } catch (error) { setFormatError(error instanceof Error ? error.message : "Could not save format."); }
    finally { setFormatSaving(false); }
  }

  if (loading) return <main className="grid min-h-dvh grid-cols-[180px_1fr] gap-8 p-6" aria-label="Loading editor" aria-busy="true"><div className="rounded-xl bg-muted motion-safe:animate-pulse" /><div className="mx-auto my-auto aspect-[4/5] w-full max-w-md rounded-xl bg-muted motion-safe:animate-pulse" /></main>;
  if (loadError || !doc || !meta) return <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6"><h1 className="text-2xl font-medium">Couldn’t open this carousel</h1><p role="alert">{loadError ?? "Carousel missing."}</p><Button onClick={reload}>Try again</Button><Link href="/new" className="text-sm underline">Create a new carousel</Link></main>;

  return (
    <main className="editor-shell">
      <header className="editor-header">
        <Link href="/new" aria-label="Back to carousels" className="flex shrink-0 items-center gap-2 rounded-lg focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft size={18} /><Mark /></Link>
        <div className="min-w-0 flex-1">
          <input aria-label="Carousel title" className="w-full max-w-md rounded border border-transparent bg-transparent px-2 py-1 text-sm font-medium hover:border-border focus:border-ring focus:outline-none" value={meta.title} maxLength={120}
            onChange={(event) => { if (event.target.value.trim()) mutate([{ op: "rename", title: event.target.value }]); }} />
          <p className="flex items-center gap-1.5 px-2 text-xs text-ink-soft" role="status">
            {saveState === "saving" ? <CircleNotch className="motion-safe:animate-spin" size={12} /> : <CheckCircle size={12} />}
            {saveState === "saving" ? "Saving changes…" : saveState === "error" ? "Saved on this device" : "All changes saved"}
          </p>
        </div>
        <Button variant="ghost" aria-label="Undo" title="Undo (⌘Z)" disabled={!undoCount || saveState === "saving"} onClick={() => void undo()}><ArrowUUpLeft size={18} /></Button>
        <Button variant="outline" className="hidden sm:inline-flex" onClick={() => { setFormatName(meta.title.slice(0, 80)); setFormatError(null); setFormatOpen(true); }}><FloppyDisk size={16} /> Save as format</Button>
        <Button onClick={() => setExportOpen(true)}><DownloadSimple size={16} /> Export</Button>
      </header>

      {saveError ? <div className="flex flex-wrap items-center gap-3 border-b border-destructive/20 bg-card px-5 py-3 text-sm" role="alert">
        <span className="flex-1 text-destructive">{saveError}</span>
        {conflict ? <><Button variant="outline" onClick={downloadLocal}>Download local draft</Button><Button variant="outline" onClick={discardLocal}>Load latest version</Button></> : <Button variant="outline" onClick={() => void retry()}>Retry save</Button>}
      </div> : null}
      {notice ? <div className="flex flex-wrap items-center justify-center gap-3 border-b border-border bg-card px-4 py-2 text-sm" role="status"><span>{notice}</span><Link href="/new" className="underline underline-offset-4">Your formats</Link><button onClick={() => setNotice(null)} className="min-h-8 px-2 text-ink-soft">Dismiss</button></div> : null}

      <div className="editor-workspace">
        <aside className="editor-slides" aria-label="Slide navigator">
          <div className="flex items-center justify-between px-4 pt-5"><h2 className="text-xs font-semibold">Slides <span className="ml-1 text-ink-soft">{doc.slides.length}</span></h2><button aria-label="Add slide" className="editor-icon" onClick={() => addSlide()} disabled={doc.slides.length >= 12}><Plus size={16} /></button></div>
          <SlideRail carousel={doc} index={slideIndex} onSelect={selectSlide} onReorder={reorder} />
          <div className="hidden px-4 pb-5 lg:block"><Button variant="outline" className="w-full" disabled={doc.slides.length >= 12} onClick={() => addSlide()}><Plus size={16} /> Add slide</Button><p className="mt-3 text-center text-xs leading-5 text-ink-soft">Drag slides to tell your story in a different order.</p></div>
        </aside>

        <section className="editor-center" aria-label="Canvas workspace">
          <div className="editor-toolbar">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={addText}><TextT size={18} /> Text</Button>
              <Button variant="ghost" size="sm" disabled={adding} onClick={() => addFileRef.current?.click()}><ImageSquare size={18} /> {adding ? "Uploading…" : "Image"}</Button>
              <input ref={addFileRef} type="file" aria-label="Add image file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void addImage(file); }} />
            </div>
            <div className="flex items-center gap-1">
              <button className="editor-icon" aria-label="Duplicate slide" disabled={doc.slides.length >= 12} onClick={() => addSlide(true)}><Copy size={17} /></button>
              <button className="editor-icon" aria-label="Delete slide" disabled={doc.slides.length <= 1} onClick={() => { if (slide) { mutate([{ op: "delete_slide", slideId: slide.id }], { immediate: true }); selectSlide(Math.max(0, slideIndex - 1)); } }}><Trash size={17} /></button>
            </div>
          </div>
          <div ref={stageRef} className="editor-stage">
            <div className="mx-auto flex w-max min-w-full flex-col items-center gap-5 px-8 py-8">
              <div className="flex items-center gap-2 text-xs text-ink-soft"><span className="font-mono">{String(slideIndex + 1).padStart(2, "0")}</span><span className="capitalize">{slide?.role}</span><span>·</span><span>1080 × 1350</span></div>
              {slide ? <SlideCanvas key={slide.id} slide={slide} theme={doc.theme} width={canvasWidth} selectedId={selectedId} onSelect={setSelectedId} onMove={moveElement} /> : null}
              <p className="text-center text-xs text-ink-soft">Select to edit · Drag to move · Arrow keys to nudge</p>
            </div>
          </div>
          <footer className="editor-canvas-footer">
            <div className="flex items-center gap-2"><button className="editor-icon" aria-label="Previous slide" disabled={slideIndex === 0} onClick={() => selectSlide(slideIndex - 1)}><CaretLeft size={16} /></button><span className="font-mono text-xs">{slideIndex + 1} / {doc.slides.length}</span><button className="editor-icon" aria-label="Next slide" disabled={slideIndex === doc.slides.length - 1} onClick={() => selectSlide(slideIndex + 1)}><CaretRight size={16} /></button></div>
            <div className="flex items-center gap-1"><button className="editor-icon" aria-label="Zoom out" disabled={zoom <= .5} onClick={() => setZoom((value) => Math.max(.5, value - .1))}><Minus size={16} /></button><span className="w-10 text-center font-mono text-xs">{Math.round(canvasWidth / 1080 * 100)}%</span><button className="editor-icon" aria-label="Zoom in" disabled={zoom >= 1.5} onClick={() => setZoom((value) => Math.min(1.5, value + .1))}><Plus size={16} /></button><button className="editor-icon" aria-label="Fit canvas" onClick={() => setZoom(1)}><CornersOut size={16} /></button></div>
          </footer>
        </section>

        <aside className="editor-inspector" aria-label="Element properties">
          <div className="flex items-center justify-between border-b border-border pb-4"><h2 className="text-sm font-semibold">Design</h2><span className="text-xs capitalize text-ink-soft">{selected?.type ?? "Slide"}</span></div>
          <Inspector key={selected?.id ?? "none"} slide={slide} element={selected} canDelete={(slide?.elements.length ?? 0) > 1}
            onText={(elementId, text) => { if (slide) mutate([{ op: "update_text", slideId: slide.id, elementId, text }]); }}
            onStyle={(elementId, style: NonNullable<CarouselElement["style"]>) => { if (slide) mutate([{ op: "set_text_style", slideId: slide.id, elementId, style }]); }}
            onMove={moveElement} onReplaceImage={replaceImage}
            onDelete={(elementId) => { if (slide) mutate([{ op: "delete_element", slideId: slide.id, elementId }], { immediate: true }); setSelectedId(null); }} />
          {slide ? <div className="mt-6 border-t border-border pt-5"><Label htmlFor="slide-background">Slide background</Label><div className="mt-2 flex items-center gap-3"><input id="slide-background" type="color" value={slide.background.value.startsWith("#") ? slide.background.value : doc.theme.background} className="size-10 rounded-lg border border-border p-1" onChange={(event) => mutate([{ op: "set_background", slideId: slide.id, background: { type: "solid", value: event.target.value } }])} /><span className="font-mono text-xs text-ink-soft">{slide.background.value}</span></div></div> : null}
          <Button variant="outline" className="mt-6 w-full sm:hidden" onClick={() => { setFormatName(meta.title.slice(0, 80)); setFormatOpen(true); }}>Save as format</Button>
        </aside>
      </div>

      <Dialog open={formatOpen} onOpenChange={(open) => { if (!formatSaving) setFormatOpen(open); }} title="Keep a good format" description="Save this carousel’s design, copy, and images for your workspace. Each use creates an independent draft.">
        <form onSubmit={saveFormat} className="space-y-5">
          <div><Label htmlFor="format-name">Format name</Label><Input id="format-name" className="mt-2" value={formatName} onChange={(event) => setFormatName(event.target.value)} required minLength={2} maxLength={80} autoComplete="off" /></div>
          <div><Label htmlFor="format-description">Description (optional)</Label><Textarea id="format-description" className="mt-2" value={formatDescription} onChange={(event) => setFormatDescription(event.target.value)} maxLength={240} placeholder="When should your team use this format?" /></div>
          {formatError ? <p role="alert" className="text-sm text-destructive">{formatError}</p> : null}
          <Button type="submit" className="w-full" disabled={formatSaving || formatName.trim().length < 2} aria-busy={formatSaving}>{formatSaving ? "Saving format…" : "Save format"}</Button>
        </form>
      </Dialog>
      <Dialog open={exportOpen} onOpenChange={(open) => { if (!exporting) setExportOpen(open); }} title="Ready to share" description={`Export all ${doc.slides.length} slides at full resolution. Your latest edits are saved before downloading.`}>
        <div className="space-y-3">
          <button className="export-option" disabled={!!exporting} onClick={() => void download("png")}><ImageSquare size={28} /><span className="flex-1"><strong className="block text-sm font-medium">PNG images</strong><span className="mt-1 block text-xs text-ink-soft">1080 × 1350 · One image per slide · ZIP</span></span>{exporting === "png" ? <CircleNotch className="motion-safe:animate-spin" size={20} /> : <DownloadSimple size={20} />}</button>
          <button className="export-option" disabled={!!exporting} onClick={() => void download("pdf")}><Copy size={28} /><span className="flex-1"><strong className="block text-sm font-medium">PDF document</strong><span className="mt-1 block text-xs text-ink-soft">One page per slide · Ready for LinkedIn</span></span>{exporting === "pdf" ? <CircleNotch className="motion-safe:animate-spin" size={20} /> : <DownloadSimple size={20} />}</button>
          {saveError ? <p role="alert" className="text-sm text-destructive">{saveError}</p> : null}
        </div>
      </Dialog>
    </main>
  );
}
