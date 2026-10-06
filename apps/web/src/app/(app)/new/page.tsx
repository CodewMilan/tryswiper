"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_THEME, getFormat, planFromFormat, renderPlanToCarousel, type Slide, type Theme } from "@swiper/schema";
import { SlidePreview } from "@/components/editor/slide-frame";
import { Check, Plus } from "@phosphor-icons/react";

type FormatOption = {
  id: string;
  name: string;
  description: string;
  slideCount: { min: number; max: number };
  roles: string[];
  source: "official" | "workspace";
  preview?: { slide: Slide; theme: Theme };
};

function FormatChoice({ format, checked, onChange }: {
  format: FormatOption;
  checked: boolean;
  onChange: () => void;
}) {
  const official = getFormat(format.id);
  const preview = format.preview ?? (official ? {
    slide: renderPlanToCarousel(planFromFormat(official, { productName: "Your story" }), DEFAULT_THEME).slides[0]!,
    theme: DEFAULT_THEME,
  } : null);
  const count = format.slideCount.min === format.slideCount.max
    ? `${format.slideCount.min} slides`
    : `${format.slideCount.min}–${format.slideCount.max} slides`;
  return (
    <label
      className={`group block min-h-44 cursor-pointer rounded-xl border bg-card p-5 motion-safe:transition-[border-color,box-shadow,transform] motion-safe:duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background ${
        checked ? "border-foreground shadow-sm" : "border-border hover:-translate-y-0.5 hover:border-foreground/20"
      }`}
    >
      <input type="radio" name="format" value={format.id} checked={checked} onChange={onChange} className="sr-only" />
      <span className="mb-4 flex items-center gap-5 rounded-lg bg-secondary p-4">
        {format.id === "freeform" ? <span className="grid h-28 w-24 shrink-0 place-items-center rounded-md border border-dashed border-ink-soft/40 bg-card"><Plus size={24} className="text-ink-soft" /></span>
          : preview ? <span aria-hidden className="pointer-events-none shrink-0 shadow-sm"><SlidePreview slide={preview.slide} theme={preview.theme} width={92} /></span> : null}
        <span className="min-w-0 space-y-2">
          {format.roles.slice(0, 3).map((role, index) => <span key={index} className="block truncate text-xs capitalize text-ink-soft"><span className="mr-2 font-mono opacity-70">{String(index + 1).padStart(2, "0")}</span>{role.replaceAll("-", " ")}</span>)}
          {format.roles.length > 3 ? <span className="block text-xs text-ink-soft">+{format.roles.length - 3} more slides</span> : null}
        </span>
        {checked ? <Check size={18} className="ml-auto shrink-0 self-start" /> : null}
      </span>
      <span className="flex flex-wrap items-start justify-between gap-2">
        <span className="text-base font-medium tracking-[-0.02em] text-foreground">{format.name}</span>
        <span className="shrink-0 font-mono text-xs uppercase tracking-wider text-ink-soft">{count}</span>
      </span>
      <span className="mt-2 block text-sm leading-6 text-ink-soft">{format.description}</span>
      <span className="mt-4 block font-mono text-xs leading-5 text-ink-soft">{format.roles.join(" · ")}</span>
    </label>
  );
}

export default function NewCarouselPage() {
  const router = useRouter();
  const [formats, setFormats] = useState<FormatOption[]>([]);
  const [formatId, setFormatId] = useState("freeform");
  const [title, setTitle] = useState("");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const loadFormats = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/formats");
      const body = (await response.json()) as { formats?: FormatOption[]; message?: string };
      if (!response.ok || !body.formats) throw new Error(body.message ?? "Could not load formats.");
      setFormats(body.formats);
      setFormatId((current) => body.formats!.some((format) => format.id === current)
        ? current
        : (body.formats![0]?.id ?? ""));
      setLoadState("ready");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load formats.");
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    // This effect synchronizes the picker with its authenticated API resource.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFormats();
  }, [loadFormats]);

  const selected = useMemo(() => formats.find((format) => format.id === formatId), [formatId, formats]);
  const startByHand = formats.find((format) => format.id === "freeform");
  const workspaceFormats = formats.filter((format) => format.source === "workspace");
  const officialFormats = formats.filter((format) => format.source === "official" && format.id !== "freeform");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/carousels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format_id: selected.id, title: title.trim() || undefined }),
      });
      const body = (await response.json()) as { carousel_id?: string; message?: string };
      if (!response.ok || !body.carousel_id) throw new Error(body.message ?? "Could not start the carousel.");
      router.push(`/c/${body.carousel_id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not start the carousel.");
      setPending(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">Create</p>
        <h1 className="mt-3 text-4xl font-light leading-tight tracking-[-0.03em] text-foreground sm:text-5xl">Start a carousel</h1>
        <p className="mt-3 max-w-xl text-base leading-7 text-ink-soft">
          Build by hand, reuse something your workspace already made, or begin with a proven story structure. No agent connection required.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-10">
        <div className="max-w-lg">
          <Label htmlFor="title">Carousel title</Label>
          <Input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={selected?.name ?? "Untitled carousel"}
            maxLength={120}
            className="mt-2"
            autoComplete="off"
            aria-describedby="title-hint"
          />
          <p id="title-hint" className="mt-2 text-sm text-ink-soft">Optional. Story formats use your brand kit; workspace formats keep their saved design.</p>
        </div>

        {loadState === "loading" ? (
          <div className="mt-10" aria-busy="true" aria-label="Loading formats">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-44 animate-pulse rounded-xl bg-muted" />)}
            </div>
          </div>
        ) : null}

        {loadState === "error" ? (
          <div className="mt-10 max-w-lg rounded-xl border border-destructive/20 bg-card p-5" role="alert">
            <p className="text-sm font-medium text-destructive">Couldn’t load your format library</p>
            <p className="mt-1 text-sm text-ink-soft">{error}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => {
                setLoadState("loading");
                setError(null);
                void loadFormats();
              }}
            >
              Try again
            </Button>
          </div>
        ) : null}

        {loadState === "ready" ? (
          <div className="space-y-10">
            {startByHand ? (
              <fieldset className="mt-10">
                <legend className="text-lg font-medium tracking-[-0.02em]">Blank canvas</legend>
                <p className="mt-1 text-sm text-ink-soft">Start with three editable slides and shape the story yourself.</p>
                <div className="mt-4 max-w-xl">
                  <FormatChoice format={startByHand} checked={startByHand.id === formatId} onChange={() => setFormatId(startByHand.id)} />
                </div>
              </fieldset>
            ) : null}

            <fieldset>
              <legend className="text-lg font-medium tracking-[-0.02em]">Your workspace formats</legend>
              {workspaceFormats.length > 0 ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {workspaceFormats.map((format) => (
                    <FormatChoice key={format.id} format={format} checked={format.id === formatId} onChange={() => setFormatId(format.id)} />
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-5">
                  <p className="text-sm font-medium">No saved formats yet</p>
                  <p className="mt-1 text-sm leading-6 text-ink-soft">Open any carousel and choose “Save as format” to make its structure reusable here.</p>
                </div>
              )}
            </fieldset>

            <fieldset>
              <legend className="text-lg font-medium tracking-[-0.02em]">Story formats</legend>
              <p className="mt-1 text-sm text-ink-soft">Pick a narrative shape, then replace the placeholder copy in the editor.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {officialFormats.map((format) => (
                  <FormatChoice key={format.id} format={format} checked={format.id === formatId} onChange={() => setFormatId(format.id)} />
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}

        {loadState === "ready" && error ? <p className="mt-6 text-sm text-destructive" role="alert">{error}</p> : null}

        {loadState === "ready" ? (
          <div className="sticky bottom-4 mt-10 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card/95 p-3 shadow-md backdrop-blur">
            <Button type="submit" disabled={pending || !selected} aria-busy={pending}>{pending ? "Opening…" : "Open in editor"}</Button>
            <p className="text-sm text-ink-soft">{selected ? `${selected.name} · ${selected.roles.length} slides` : "Choose a format"}</p>
          </div>
        ) : null}
      </form>
    </main>
  );
}
