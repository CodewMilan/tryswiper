"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MonthlyAllowance } from "@/components/monthly-allowance";
import { isThinBrand, type GenerationWarning } from "@/lib/generation-notices";
import { useWorkspaceUsage, usageLimitMessage, type UsageApiError } from "@/lib/use-workspace-usage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_THEME, getFormat, planFromFormat, renderPlanToCarousel, type Slide, type Theme } from "@swiper/schema";
import { SlidePreview } from "@/components/editor/slide-frame";
import { ArrowRight, Check, Plus } from "@phosphor-icons/react";

const EXAMPLE_BRIEFS = [
  { name: "Explain a problem", brief: "Explain the main problem my product solves for my audience. Start with a specific pain point, share a practical insight, and finish with a clear next step. Use my brand kit." },
  { name: "Share practical tips", brief: "Share five practical tips my audience can use today, based on my product and brand kit. Keep each tip specific and actionable. End with an invitation to learn more." },
];

function slideCount(format: FormatOption) {
  return format.slideCount.min === format.slideCount.max ? `${format.slideCount.min} slides` : `${format.slideCount.min}–${format.slideCount.max} slides`;
}

type FormatOption = {
  id: string;
  name: string;
  description: string;
  slideCount: { min: number; max: number };
  roles: string[];
  source: "official" | "workspace";
  can_generate?: boolean;
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
      className={`group block min-h-44 cursor-pointer rounded-[24px] border bg-white p-6 motion-safe:transition-[border-color,transform] motion-safe:duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background ${
        checked ? "border-black" : "border-black/8 hover:-translate-y-0.5 hover:border-black/20"
      }`}
    >
      <input type="radio" name="format" value={format.id} checked={checked} onChange={onChange} className="sr-only" />
      <span className="mb-4 flex items-center gap-5 rounded-lg bg-secondary p-4">
        {format.id === "freeform" ? <span className="grid h-28 w-24 shrink-0 place-items-center rounded-md border border-dashed border-ink-soft/40 bg-card"><Plus size={24} className="text-ink-soft" /></span>
          : preview ? <span aria-hidden className="pointer-events-none shrink-0"><SlidePreview slide={preview.slide} theme={preview.theme} width={92} /></span> : null}
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
  const workspaceUsage = useWorkspaceUsage();
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
  const [usageLimited, setUsageLimited] = useState(false);
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [thinBrand, setThinBrand] = useState(false);
  const pendingRequest = useRef<{ key: string; payload: string } | null>(null);
  const [recoveredDraftId, setRecoveredDraftId] = useState<string | null>(null);
  const usage = workspaceUsage.data;
  const carouselFull = !!usage && (usage.usage.carousel ?? 0) >= usage.limits.carousel;
  const generationFull = !!usage && (usage.usage.generation ?? 0) >= usage.limits.generation;
  const allowanceBlocked = carouselFull || (mode === "generate" && generationFull);

  const loadFormats = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/formats");
      const body = (await response.json()) as { formats?: FormatOption[]; message?: string };
      if (!response.ok || !body.formats) throw new Error(body.message ?? "Could not load formats.");
      const available = body.formats;
      const storyFormats = available.filter((format) => format.id !== "freeform" && format.can_generate !== false);
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

  useEffect(() => {
    let active = true;
    async function restoreDraft() {
      try {
        const response = await fetch("/api/v1/brand");
        if (!response.ok) return;
        const body = await response.json() as { brand?: { id?: string; description?: string; audience?: string } };
        if (!body.brand?.id || !active) return;
        setThinBrand(isThinBrand(body.brand));
        const key = `swiper:brief:${body.brand.id}`;
        const raw = sessionStorage.getItem(key);
        if (raw) {
          const saved = JSON.parse(raw) as Record<string, unknown>;
          if (saved && typeof saved.brief === "string" && typeof saved.title === "string" && typeof saved.referenceUrl === "string") {
            setBrief(saved.brief); setTitle(saved.title); setReferenceUrl(saved.referenceUrl);
            if (saved.mode === "generate" || saved.mode === "manual") setMode(saved.mode);
            if (typeof saved.generateFormatId === "string") setGenerateFormatId(saved.generateFormatId);
            if (typeof saved.manualFormatId === "string") setManualFormatId(saved.manualFormatId);
            setRestored(!!(saved.brief || saved.title || saved.referenceUrl));
          }
        }
        setDraftKey(key);
        const pending = JSON.parse(sessionStorage.getItem(`${key}:request`) ?? "null") as { key?: string } | null;
        if (pending?.key) {
          const statusResponse = await fetch(`/api/v1/requests/${encodeURIComponent(pending.key)}`);
          if (statusResponse.ok) {
            const status = await statusResponse.json() as { status: string; carousel_id?: string; result?: { carousel_id?: string } };
            if (active && status.status === "completed" && status.result?.carousel_id) setRecoveredDraftId(status.result.carousel_id);
            else if (active && status.status === "expired" && status.carousel_id) setRecoveredDraftId(status.carousel_id);
          }
        }
      } catch { /* Storage is optional; creation still works without it. */ }
    }
    void restoreDraft();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!draftKey) return;
    try { sessionStorage.setItem(draftKey, JSON.stringify({ brief, title, referenceUrl, mode, generateFormatId, manualFormatId })); }
    catch { /* Private browsing may disable storage. Keep the in-memory brief usable. */ }
  }, [draftKey, brief, title, referenceUrl, mode, generateFormatId, manualFormatId]);

  const formatId = mode === "generate" ? generateFormatId : manualFormatId;
  const selected = useMemo(() => formats.find((format) => format.id === formatId), [formatId, formats]);
  const startByHand = formats.find((format) => format.id === "freeform");
  const workspaceFormats = formats.filter((format) => format.source === "workspace");
  const officialFormats = formats.filter((format) => format.source === "official" && format.id !== "freeform");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || pending || allowanceBlocked) return;
    if (mode === "generate" && (brief.trim().length < 12 || selected.id === "freeform" || selected.can_generate === false)) return;
    setPending(true);
    setError(null);
    setUsageLimited(false);
    try {
      const payload = JSON.stringify({ format_id: selected.id, title: title.trim() || undefined,
        brief: mode === "generate" ? brief.trim() : undefined,
        reference_url: mode === "generate" && referenceUrl.trim() ? referenceUrl.trim() : undefined });
      let requestId = pendingRequest.current?.payload === payload ? pendingRequest.current.key : crypto.randomUUID();
      if (draftKey) {
        try {
          const previous = JSON.parse(sessionStorage.getItem(`${draftKey}:request`) ?? "null");
          if (previous?.payload === payload && typeof previous.key === "string") requestId = previous.key;
          sessionStorage.setItem(`${draftKey}:request`, JSON.stringify({ key: requestId, payload }));
        } catch { /* Request recovery is optional when browser storage is unavailable. */ }
      }
      pendingRequest.current = { key: requestId, payload };
      const response = await fetch("/api/v1/carousels", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestId },
        body: payload,
        signal: AbortSignal.timeout(90000),
      });
      const body = (await response.json()) as UsageApiError & {
        carousel_id?: string;
        source?: "model" | "local";
        warnings?: GenerationWarning[];
      };
      if (body.code === "USAGE_LIMIT") {
        setUsageLimited(true);
        void workspaceUsage.refresh();
        throw new Error(usageLimitMessage(body));
      }
      if (body.code === "CREATED_DRAFT_DELETED" || body.code === "REQUEST_ID_REUSED" || body.code === "REQUEST_EXPIRED") {
        pendingRequest.current = null;
        if (draftKey) { try { sessionStorage.removeItem(`${draftKey}:request`); } catch { /* Retry with a fresh request ID. */ } }
      }
      if (!response.ok || !body.carousel_id) throw new Error(body.message ?? "Could not start the carousel.");
      if (draftKey) { try { sessionStorage.removeItem(draftKey); sessionStorage.removeItem(`${draftKey}:request`); } catch { /* The server draft is now the source of truth. */ } }
      setDraftKey(null);
      pendingRequest.current = null;
      const params = new URLSearchParams();
      if (body.warnings?.some((warning) => warning.code === "REFERENCE_UNAVAILABLE")) params.set("reference", "unavailable");
      if (body.source === "local") params.set("generation", "local");
      if (body.warnings?.some((warning) => warning.code === "THIN_BRAND")) params.set("brand", "thin");
      const query = params.toString();
      router.push(`/c/${body.carousel_id}${query ? `?${query}` : ""}`);
    } catch (submitError) {
      setError(submitError instanceof Error && submitError.name === "TimeoutError" ? "The connection timed out. Your brief and request ID are saved. Retry unchanged to recover the same draft; reopening this page also checks for a completed result." : submitError instanceof Error ? submitError.message : "Could not start the carousel. Retry unchanged to recover the same draft.");
      setPending(false);
    }
  }

  return (
    <main id="main-content" className="mx-auto w-full max-w-[1100px] px-6 py-12">
      <div className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">Create</p>
        <h1 className="mt-3 text-4xl font-light leading-tight tracking-[-0.03em] text-foreground sm:text-5xl">Start a carousel</h1>
        <p className="mt-3 max-w-xl text-base leading-7 text-ink-soft">
          Describe the post and get an editable first draft, or start from a format and write it yourself.
        </p>
      </div>

      <MonthlyAllowance workspace={workspaceUsage} />
      {mode === "generate" && thinBrand ? (
        <div className="mt-6 max-w-2xl rounded-[24px] border border-black/8 bg-white p-6" role="status">
          <p className="text-sm font-medium">Your brand kit is incomplete</p>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Add what you sell and who it’s for. You can still generate, but the first draft will be generic.
          </p>
          <Link href="/brand" className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Add brand details <ArrowRight size={16} />
          </Link>
        </div>
      ) : null}
      {restored ? <p role="status" className="mt-5 text-sm text-ink-soft">Your unfinished brief was restored in this tab.</p> : null}
      {recoveredDraftId ? <p role="status" className="mt-5 text-sm">Your previous request finished. <Link className="underline underline-offset-4" href={`/c/${recoveredDraftId}`}>Open the recovered draft</Link> before generating again.</p> : null}
      <form onSubmit={onSubmit} className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <fieldset disabled={pending} className="min-w-0">
        <legend className="sr-only">Create your carousel</legend>
        <Tabs value={mode} onValueChange={(value) => setMode(value as "generate" | "manual")}>
        <TabsList aria-label="Creation method"><TabsTrigger value="generate">Generate from a brief</TabsTrigger><TabsTrigger value="manual">Start by hand</TabsTrigger></TabsList>
        <TabsContent value={mode}>

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
              aria-describedby="brief-hint"
            />
            <p id="brief-hint" className="mt-2 text-sm leading-6 text-ink-soft">Include the topic, audience, and takeaway. {brief.trim().length > 0 && brief.trim().length < 12 ? `${12 - brief.trim().length} more characters needed.` : "At least 12 characters."}</p>
            <div className="mt-4 flex flex-wrap gap-2"><span className="w-full text-xs text-ink-soft">Need a starting point?</span>{EXAMPLE_BRIEFS.map((example) => <Button key={example.name} type="button" size="sm" variant="outline" onClick={() => setBrief(example.brief)}>{example.name}</Button>)}</div>
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
              <p className="mt-2 text-sm leading-6 text-ink-soft">Public HTTPS posts from LinkedIn, X, Threads, or Instagram. Swiper adapts structure and pacing with original copy. If the post is private or unreadable, we’ll generate from your brief.</p>
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
            <div className="h-5 w-32 motion-safe:animate-pulse rounded bg-muted" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-44 motion-safe:animate-pulse rounded-[24px] bg-white" />)}
            </div>
          </div>
        ) : null}

        {loadState === "error" ? (
          <div className="mt-10 max-w-lg rounded-[24px] border border-black/8 bg-white p-6" role="alert">
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
              {workspaceFormats.some((format) => format.can_generate !== false) ? <optgroup label="Your workspace formats">{workspaceFormats.filter((format) => format.can_generate !== false).map((format) => <option key={format.id} value={format.id}>{format.name}</option>)}</optgroup> : null}
            </select>
            <p id="story-shape-hint" className="mt-2 text-sm leading-6 text-ink-soft">{selected?.description ?? "Choose a narrative shape for your brief."}</p>
            {selected?.source === "workspace" ? <p className="mt-2 text-sm leading-6 text-ink-soft">Uses your saved design and images. Writes new headline, kicker, body, proof and CTA copy; fixed labels and captions stay as saved. Review every slide.</p> : null}
          </section>
        ) : null}

        {loadState === "ready" && mode === "manual" ? (
          <div className="space-y-10">
            {startByHand ? (
              <fieldset className="mt-10">
                <legend className="text-xl font-light tracking-[-0.02em]">Blank canvas</legend>
                <p className="mt-1 text-sm text-ink-soft">Start with three editable slides and shape the story yourself.</p>
                <div className="mt-4 max-w-xl">
                  <FormatChoice format={startByHand} checked={startByHand.id === formatId} onChange={() => setManualFormatId(startByHand.id)} />
                </div>
              </fieldset>
            ) : null}

            <fieldset>
              <legend className="text-xl font-light tracking-[-0.02em]">Your workspace formats</legend>
              {workspaceFormats.length > 0 ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {workspaceFormats.map((format) => (
                    <FormatChoice key={format.id} format={format} checked={format.id === formatId} onChange={() => setManualFormatId(format.id)} />
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-[24px] border border-dashed border-black/15 bg-white p-6">
                  <p className="text-sm font-medium">No saved formats yet</p>
                  <p className="mt-1 text-sm leading-6 text-ink-soft">Open any carousel and choose “Save as format” to make its structure reusable here.</p>
                </div>
              )}
            </fieldset>

            <fieldset>
              <legend className="text-xl font-light tracking-[-0.02em]">Story formats</legend>
              <p className="mt-1 text-sm text-ink-soft">Pick the narrative shape Swiper should use for the first draft.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {officialFormats.map((format) => (
                  <FormatChoice key={format.id} format={format} checked={format.id === formatId} onChange={() => setManualFormatId(format.id)} />
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}

        {allowanceBlocked ? (
          <div className="mt-6 max-w-2xl rounded-[24px] border border-black/8 bg-white p-6 text-sm leading-6" role="status">
            <p>{carouselFull
              ? "You’ve used all your carousel slots this month. Delete a carousel created this month to free a slot, wait for the monthly reset, or upgrade your plan."
              : "You’ve used all your AI generations this month. Start by hand without an AI generation, wait for the monthly reset, or upgrade your plan."}</p>
            <Link href="/pricing" className="mt-3 inline-flex min-h-10 items-center rounded-[14px] bg-black px-4 font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">View plans and limits</Link>
          </div>
        ) : null}
        {loadState === "ready" && error ? <div className="mt-6 text-sm" role="alert"><p className="text-destructive">{error}</p>{usageLimited ? <Link href="/pricing" className="mt-2 inline-flex min-h-10 items-center rounded-[14px] px-3 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">View plans and limits</Link> : null}</div> : null}

        {loadState === "ready" ? (
          <div className="sticky bottom-4 mt-10 flex flex-wrap items-center gap-4 rounded-[24px] border border-black/8 bg-white p-4">
            <Button type="submit" disabled={pending || allowanceBlocked || !selected || (mode === "generate" && brief.trim().length < 12)} aria-busy={pending}>{pending ? (mode === "generate" ? "Generating…" : "Opening…") : mode === "generate" ? "Generate carousel" : "Open in editor"}</Button>
            <p role="status" className="text-sm text-ink-soft">{pending ? "Creating your editable draft. Model calls have a one-minute limit; an unavailable model produces a labeled local draft. Reopening this page checks whether your request finished." : selected ? `${selected.name} · ${slideCount(selected)}` : "Choose a format"}</p>
          </div>
        ) : null}
        </TabsContent>
        </Tabs>
        </fieldset>
        <aside aria-label="Your next steps" className="rounded-[24px] border border-border bg-card p-6 lg:sticky lg:top-6">
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">Your draft</p>
          <h2 className="mt-3 text-xl font-medium tracking-tight">{selected?.name ?? "Choose a story shape"}</h2>
          {selected ? <><p className="mt-2 text-sm text-ink-soft">{slideCount(selected)} · 1080 × 1350</p><ol className="mt-5 space-y-3">{selected.roles.map((role, index) => <li key={index} className="flex items-center gap-3 text-sm capitalize"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary font-mono text-xs text-ink-soft">{index + 1}</span>{role.replaceAll("-", " ")}</li>)}</ol></> : null}
          <div className="mt-6 border-t border-border pt-5"><h3 className="text-sm font-medium">What happens next?</h3><p className="mt-2 text-sm leading-6 text-ink-soft">Your draft opens in the editor. Review each slide, edit the copy and layout, then export PNG images or a PDF.</p><p className="mt-3 text-xs leading-5 text-ink-soft">Uses 1 carousel slot{mode === "generate" ? " and 1 AI generation" : "; no AI generation used"}. Nothing is posted automatically.</p><Link href="/brand" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium">Review your brand kit <ArrowRight size={16} /></Link></div>
        </aside>
      </form>
    </main>
  );
}
