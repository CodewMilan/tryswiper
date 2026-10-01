"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Carousel, CarouselElement, Slide } from "@swiper/schema";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@swiper/schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Payload = {
  carousel_id: string;
  title: string;
  format_id: string;
  version: number;
  status: string;
  carousel: Carousel;
};

export function Editor({ carouselId }: { carouselId: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/carousels/${carouselId}`);
      const body = (await response.json()) as Payload & { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Could not open carousel.");
      setData(body);
      setSelectedId(body.carousel.slides[0]?.elements[0]?.id ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not open carousel.");
    } finally {
      setLoading(false);
    }
  }, [carouselId]);

  useEffect(() => {
    void load();
  }, [load]);

  const slide: Slide | undefined = data?.carousel.slides[index];
  const selected: CarouselElement | undefined = slide?.elements.find(
    (element) => element.id === selectedId,
  );

  async function saveText(elementId: string, text: string) {
    if (!slide) return;
    setSaveState("saving");
    try {
      const response = await fetch(`/api/v1/carousels/${carouselId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operations: [
            { op: "update_text", slideId: slide.id, elementId, text },
          ],
        }),
      });
      const body = (await response.json()) as { carousel?: Carousel; message?: string };
      if (!response.ok) throw new Error(body.message ?? "Save failed.");
      setData((current) =>
        current && body.carousel ? { ...current, carousel: body.carousel } : current,
      );
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <div className="h-[70vh] w-[min(90vw,520px)] animate-pulse rounded-xl bg-secondary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6">
        <p className="text-sm text-destructive">{error ?? "Carousel missing."}</p>
        <Button className="mt-4" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="grid min-h-full grid-cols-1 lg:grid-cols-[220px_1fr_280px]">
      <aside className="border-b border-border p-4 lg:border-r lg:border-b-0">
        <Link
          href="/connect"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Connect
        </Link>
        <p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">Slides</p>
        <ol className="mt-2 space-y-2">
          {data.carousel.slides.map((item, slideIndex) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  setIndex(slideIndex);
                  setSelectedId(item.elements[0]?.id ?? null);
                }}
                className={`flex min-h-10 w-full items-center rounded-md px-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  slideIndex === index ? "bg-secondary font-medium" : "hover:bg-secondary/60"
                }`}
              >
                {slideIndex + 1}. {item.role}
              </button>
            </li>
          ))}
        </ol>
      </aside>

      <section className="flex flex-col bg-muted/40">
        <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold">{data.title}</h1>
            <p className="text-xs text-muted-foreground">{data.format_id}</p>
          </div>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {saveState === "saving"
              ? "Saving…"
              : saveState === "saved"
                ? "Saved"
                : saveState === "error"
                  ? "Save failed"
                  : "Draft"}
          </p>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-auto p-6">
          {slide ? <SlideCanvas slide={slide} theme={data.carousel.theme} selectedId={selectedId} onSelect={setSelectedId} /> : (
            <p className="text-sm text-muted-foreground">No slides in this carousel.</p>
          )}
        </div>
      </section>

      <aside className="border-t border-border p-4 lg:border-t-0 lg:border-l">
        <h2 className="text-sm font-medium">Inspector</h2>
        {selected?.text != null ? (
          <div className="mt-4 space-y-2">
            <Label htmlFor="element-text">{selected.role ?? selected.type}</Label>
            <Textarea
              id="element-text"
              key={selected.id}
              defaultValue={selected.text}
              onBlur={(event) => {
                if (event.target.value !== selected.text) {
                  void saveText(selected.id, event.target.value);
                }
              }}
            />
            <p className="text-xs text-muted-foreground">Blur to save. Agent edits land here too.</p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Select a text element on the canvas.</p>
        )}
      </aside>
    </div>
  );
}

function SlideCanvas({
  slide,
  theme,
  selectedId,
  onSelect,
}: {
  slide: Slide;
  theme: Carousel["theme"];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className="relative shadow-sm"
      style={{
        width: "min(100%, 420px)",
        aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
        background: slide.background.value || theme.background,
        fontFamily: theme.fontFamily,
      }}
    >
      {slide.elements.map((element) => (
        <button
          key={element.id}
          type="button"
          onClick={() => onSelect(element.id)}
          className={`absolute overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            selectedId === element.id ? "ring-2 ring-ring" : ""
          }`}
          style={{
            left: `${(element.x / CANVAS_WIDTH) * 100}%`,
            top: `${(element.y / CANVAS_HEIGHT) * 100}%`,
            width: `${(element.width / CANVAS_WIDTH) * 100}%`,
            height: `${(element.height / CANVAS_HEIGHT) * 100}%`,
            color: element.style?.color ?? theme.primary,
            fontSize: `${(element.style?.fontSize ?? 24) * (420 / CANVAS_WIDTH)}px`,
            fontWeight: element.style?.fontWeight,
            textAlign: element.style?.align,
            lineHeight: element.style?.lineHeight,
            letterSpacing: element.style?.letterSpacing,
          }}
          aria-label={element.role ?? element.type}
        >
          {element.text}
        </button>
      ))}
    </div>
  );
}
