"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CarouselElement, Slide } from "@swiper/schema";
import { Button } from "@/components/ui/button";
import { Inspector, uploadImage, type UploadedAsset } from "@/components/editor/inspector";
import { SlideCanvas } from "@/components/editor/slide-canvas";
import { SlideRail } from "@/components/editor/slide-rail";
import { clampBox, type Box } from "@/components/editor/slide-frame";
import { useCarousel } from "@/components/editor/use-carousel";

export function Editor({ carouselId }: { carouselId: string }) {
  const {
    doc,
    meta,
    undoCount,
    loading,
    loadError,
    saveState,
    saveError,
    setSaveError,
    reload,
    mutate,
    undo,
  } = useCarousel(carouselId);

  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);
  const [adding, setAdding] = useState(false);
  const addFileRef = useRef<HTMLInputElement | null>(null);

  // Deleting a slide can leave the index past the end.
  const slideIndex = doc ? Math.min(index, doc.slides.length - 1) : index;
  const slide: Slide | undefined = doc?.slides[slideIndex];
  // Undo and delete can take the selected element away; then nothing is selected.
  const selected: CarouselElement | undefined = slide?.elements.find(
    (element) => element.id === selectedId,
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable === true;
      if (typing) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        void undo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo]);

  function moveElement(elementId: string, box: Box, options?: { immediate?: boolean }) {
    if (!slide) return;
    mutate([{ op: "set_element_box", slideId: slide.id, elementId, ...box }], options);
  }

  function reorder(slideId: string, toIndex: number) {
    if (!doc) return;
    const bounded = Math.max(0, Math.min(doc.slides.length - 1, toIndex));
    mutate([{ op: "reorder_slide", slideId, toIndex: bounded }], { immediate: true });
    setIndex(bounded);
  }

  function replaceImage(elementId: string, asset: UploadedAsset) {
    if (!slide) return;
    mutate(
      [{ op: "set_element_image", slideId: slide.id, elementId, assetId: asset.id, src: asset.url }],
      { immediate: true },
    );
  }

  async function addImage(file: File) {
    if (!slide) return;
    setAdding(true);
    setSaveError(null);
    try {
      const asset = await uploadImage(file);
      const width = 760;
      const box = clampBox({
        x: 160,
        y: 420,
        width,
        height: Math.round((width * asset.height) / asset.width),
      });
      const id = `el_${Math.random().toString(36).slice(2, 10)}`;
      mutate(
        [
          {
            op: "add_element",
            slideId: slide.id,
            element: { id, type: "image", assetId: asset.id, src: asset.url, ...box },
          },
        ],
        { immediate: true },
      );
      setSelectedId(id);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setAdding(false);
    }
  }

  async function download(format: "png" | "pdf") {
    setExporting(format);
    setSaveError(null);
    try {
      const response = await fetch(`/api/v1/carousels/${carouselId}/export?format=${format}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "Export failed.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const match = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "");
      link.href = url;
      link.download = match?.[1] ?? (format === "pdf" ? "carousel.pdf" : "carousel.zip");
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setExporting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <div className="h-[70vh] w-[min(90vw,520px)] animate-pulse rounded-xl bg-secondary" />
      </div>
    );
  }

  if (loadError || !doc || !meta) {
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6">
        <p className="text-sm text-destructive">{loadError ?? "Carousel missing."}</p>
        <Button className="mt-4" onClick={reload}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="grid min-h-[calc(100vh-5rem)] grid-cols-1 lg:grid-cols-[240px_1fr_300px]">
      <aside className="border-b border-black/8 bg-white p-4 lg:border-r lg:border-b-0">
        <div className="flex items-center gap-3">
          <Link href="/new" className="text-sm text-ink-soft hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            ← New
          </Link>
          <Link href="/connect" className="text-sm text-ink-soft hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Connect
          </Link>
        </div>
        <p className="mt-4 text-xs uppercase tracking-wide text-ink-faint">Slides</p>
        <SlideRail
          carousel={doc}
          index={slideIndex}
          onSelect={(next) => {
            setIndex(next);
            setSelectedId(doc.slides[next]?.elements[0]?.id ?? null);
          }}
          onReorder={reorder}
        />
        <p className="mt-3 text-xs text-ink-faint">Drag a slide, or use the arrows, to reorder.</p>
      </aside>

      <section className="flex flex-col bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/8 bg-white px-4 py-3">
          <div>
            <h1 className="text-sm font-medium">{meta.title}</h1>
            <p className="text-xs text-ink-faint">
              {meta.formatId} · v{meta.version}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-ink-soft" aria-live="polite">
              {saveError
                ? saveError
                : saveState === "saving"
                  ? "Saving…"
                  : saveState === "saved"
                    ? "Saved"
                    : "Draft"}
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={undoCount === 0}
              onClick={() => void undo()}
            >
              Undo
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={adding}
              onClick={() => addFileRef.current?.click()}
            >
              {adding ? "Adding…" : "Add image"}
            </Button>
            <input
              ref={addFileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void addImage(file);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={exporting != null}
              onClick={() => void download("png")}
            >
              {exporting === "png" ? "Exporting…" : "PNG"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={exporting != null}
              onClick={() => void download("pdf")}
            >
              {exporting === "pdf" ? "Exporting…" : "PDF"}
            </Button>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-auto p-6">
          {slide ? (
            <SlideCanvas
              slide={slide}
              theme={doc.theme}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMove={moveElement}
            />
          ) : (
            <p className="text-sm text-ink-soft">No slides in this carousel.</p>
          )}
        </div>
      </section>

      <aside className="border-t border-black/8 bg-white p-4 lg:border-t-0 lg:border-l">
        <h2 className="text-sm font-medium">Inspector</h2>
        <Inspector
          slide={slide}
          element={selected}
          canDelete={(slide?.elements.length ?? 0) > 1}
          onText={(elementId, text) => {
            if (!slide) return;
            mutate([{ op: "update_text", slideId: slide.id, elementId, text }]);
          }}
          onMove={(elementId, box) => moveElement(elementId, box)}
          onReplaceImage={replaceImage}
          onDelete={(elementId) => {
            if (!slide) return;
            mutate([{ op: "delete_element", slideId: slide.id, elementId }], { immediate: true });
            setSelectedId(null);
          }}
        />
      </aside>
    </div>
  );
}
