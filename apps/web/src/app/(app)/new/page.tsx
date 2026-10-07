"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
      className={`group block min-h-44 cursor-pointer rounded-[24px] border bg-white p-5 motion-safe:transition-[border-color,box-shadow,transform] motion-safe:duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background ${
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
  const [generateFormatId, setGenerateFormatId] = useState("problem-insight-product");
  const [manualFormatId, setManualFormatId] = useState("freeform");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [mode, setMode] = useState<"generate" | "manual">("generate");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const loadFormats = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/formats");
      const body = (await response.json()) as { formats?: FormatOption[]; message?: string };
      if (!response.ok || !body.formats) throw new Error(body.message ?? "Could not load formats.");
      const available = body.formats;
      const storyFormats = available.filter((format) => format.source === "official" && format.id !== "freeform");
      setFormats(available);
      setGenerateFormatId((current) => storyFormats.some((format) => format.id === current)
        ? current
        : (storyFormats[0]?.id ?? ""));
      setManualFormatId((current) => available.some((format) => format.id === current)
        ? current
        : (available[0]?.id ?? ""));
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

  const formatId = mode === "generate" ? generateFormatId : manualFormatId;
  const selected = useMemo(() => formats.find((format) => format.id === formatId), [formatId, formats]);
  const startByHand = formats.find((format) => format.id === "freeform");
  const workspaceFormats = formats.filter((format) => format.source === "workspace");
  const officialFormats = formats.filter((format) => format.source === "official" && format.id !== "freeform");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || pending) return;
    if (mode === "generate" && (brief.trim().length < 12 || selected.source !== "official" || selected.id === "freeform")) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/carousels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format_id: selected.id,
          title: title.trim() || undefined,
          brief: mode === "generate" ? brief.trim() : undefined,
          reference_url: mode === "generate" && referenceUrl.trim() ? referenceUrl.trim() : undefined,
        }),
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
          Describe the post and get an editable first draft, or start from a format and write it yourself.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-10">
        <div className="inline-flex rounded-[14px] border border-black/8 bg-white p-1" aria-label="Creation method">
          <button type="button" aria-pressed={mode === "generate"} onClick={() => setMode("generate")} className={`min-h-10 rounded-[10px] px-4 text-sm font-medium motion-safe:transition-colors ${mode === "generate" ? "bg-black text-white" : "text-ink-soft hover:text-black"}`}>Generate from a brief</button>
          <button type="button" aria-pressed={mode === "manual"} onClick={() => setMode("manual")} className={`min-h-10 rounded-[10px] px-4 text-sm font-medium motion-safe:transition-colors ${mode === "manual" ? "bg-black text-white" : "text-ink-soft hover:text-black"}`}>Start by hand</button>
        </div>

        {mode === "generate" ? (
          <section className="mt-6 max-w-2xl rounded-[24px] border border-black/8 bg-white p-6 sm:p-8">
            <Label htmlFor="brief">What should this carousel say?</Label>
            <Textarea
              id="brief"
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              placeholder="Explain why small product teams should review AI-generated marketing before it ships. Keep it direct and practical."
              className="mt-2 min-h-32"
              minLength={12}
              maxLength={10000}
              required
            />
            <div className="mt-5">
              <Label htmlFor="reference-url">Reference post URL <span className="font-normal text-ink-faint">(optional)</span></Label>
              <Input
                id="reference-url"
                type="url"
                value={referenceUrl}
                onChange={(event) => setReferenceUrl(event.target.value)}
                placeholder="https://www.linkedin.com/posts/..."
                className="mt-2"
                maxLength={2000}
              />
              <p className="mt-2 text-sm leading-6 text-ink-soft">Swiper adapts structure and pacing only. It always writes original copy and never copies creative assets.</p>
            </div>
          </section>
        ) : null}

        <div className="max-w-lg">
          <Label htmlFor="title" className="mt-8 block">Carousel title</Label>
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
          <p id="title-hint" className="mt-2 text-sm text-ink-soft">Optional. Your brand kit is applied automatically.</p>
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

        {loadState === "ready" && mode === "generate" ? (
          <section className="mt-6 max-w-2xl rounded-[24px] border border-black/8 bg-white p-6 sm:p-8">
            <Label htmlFor="story-shape">Story shape</Label>
            <select
              id="story-shape"
              value={generateFormatId}
              onChange={(event) => setGenerateFormatId(event.target.value)}
              disabled={pending}
              aria-describedby="story-shape-hint"
              className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {officialFormats.map((format) => <option key={format.id} value={format.id}>{format.name}</option>)}
            </select>
            <p id="story-shape-hint" className="mt-2 text-sm leading-6 text-ink-soft">{selected?.description ?? "Choose a narrative shape for your brief."}</p>
          </section>
        ) : null}

        {loadState === "ready" && mode === "manual" ? (
          <div className="space-y-10">
            {startByHand ? (
              <fieldset className="mt-10">
                <legend className="text-lg font-medium tracking-[-0.02em]">Blank canvas</legend>
                <p className="mt-1 text-sm text-ink-soft">Start with three editable slides and shape the story yourself.</p>
                <div className="mt-4 max-w-xl">
                  <FormatChoice format={startByHand} checked={startByHand.id === formatId} onChange={() => setManualFormatId(startByHand.id)} />
                </div>
              </fieldset>
            ) : null}

            <fieldset>
              <legend className="text-lg font-medium tracking-[-0.02em]">Your workspace formats</legend>
              {workspaceFormats.length > 0 ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {workspaceFormats.map((format) => (
                    <FormatChoice key={format.id} format={format} checked={format.id === formatId} onChange={() => setManualFormatId(format.id)} />
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
              <p className="mt-1 text-sm text-ink-soft">Pick the narrative shape Swiper should use for the first draft.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {officialFormats.map((format) => (
                  <FormatChoice key={format.id} format={format} checked={format.id === formatId} onChange={() => setManualFormatId(format.id)} />
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}

        {loadState === "ready" && error ? <p className="mt-6 text-sm text-destructive" role="alert">{error}</p> : null}

        {loadState === "ready" ? (
          <div className="sticky bottom-4 mt-10 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card/95 p-3 shadow-md backdrop-blur">
            <Button type="submit" disabled={pending || !selected || (mode === "generate" && brief.trim().length < 12)} aria-busy={pending}>{pending ? (mode === "generate" ? "Generating…" : "Opening…") : mode === "generate" ? "Generate carousel" : "Open in editor"}</Button>
            <p className="text-sm text-ink-soft">{selected ? `${selected.name} · ${selected.roles.length} slides` : "Choose a format"}</p>
          </div>
        ) : null}
      </form>
    </main>
  );
}
