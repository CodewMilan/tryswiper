"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { PageIntro, Settle } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { carouselFontFamily } from "@swiper/schema";
import {
  COLOR_KEYS,
  DEFAULT_BRAND_COLORS,
  DEFAULT_BRAND_FONTS,
  FONT_CHOICES,
  normalizeHex,
  type BrandColorKey,
  type BrandColors,
  type BrandFonts,
} from "@/lib/brand-visuals";

type BrandForm = {
  name: string;
  description: string;
  audience: string;
  positioning: string;
  tone: string;
  cta: string;
  website: string;
  wordsToUse: string;
  wordsToAvoid: string;
  proofPoints: string;
  guidelines: string;
  colors: BrandColors;
  fonts: BrandFonts;
  logoAssetId: string | null;
};

const COLOR_COPY: Record<BrandColorKey, { label: string; hint: string }> = {
  background: { label: "Background", hint: "Slide canvas" },
  primary: { label: "Primary", hint: "Headlines" },
  secondary: { label: "Secondary", hint: "Body copy" },
  accent: { label: "Accent", hint: "Marks and rules" },
};

const empty: BrandForm = {
  name: "",
  description: "",
  audience: "",
  positioning: "",
  tone: "",
  cta: "",
  website: "",
  wordsToUse: "",
  wordsToAvoid: "",
  proofPoints: "",
  guidelines: "",
  colors: DEFAULT_BRAND_COLORS,
  fonts: DEFAULT_BRAND_FONTS,
  logoAssetId: null,
};

const fieldClass =
  "flex h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-normal text-foreground motion-safe:transition-[border-color,box-shadow] motion-safe:duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function BrandPage() {
  const [form, setForm] = useState<BrandForm>(empty);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "saved" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const loadBrand = useCallback(async () => {
        setStatus("loading");
        setError(null);
      try {
        const response = await fetch("/api/v1/brand");
        const body = (await response.json()) as {
          brand?: Record<string, unknown>;
          message?: string;
        };
        if (!response.ok) throw new Error(body.message ?? "Could not load brand.");
        const brand = body.brand ?? {};
        const colors = (brand.colors ?? {}) as Partial<BrandColors>;
        const fonts = (brand.fonts ?? {}) as Partial<BrandFonts>;
        const logoAssetId = typeof brand.logoAssetId === "string" ? brand.logoAssetId : null;
        setForm({
          name: String(brand.name ?? ""),
          description: String(brand.description ?? ""),
          audience: String(brand.audience ?? ""),
          positioning: String(brand.positioning ?? ""),
          tone: String(brand.tone ?? ""),
          cta: String(brand.cta ?? ""),
          website: String(brand.website ?? ""),
          wordsToUse: Array.isArray(brand.wordsToUse) ? brand.wordsToUse.join(", ") : "",
          wordsToAvoid: Array.isArray(brand.wordsToAvoid) ? brand.wordsToAvoid.join(", ") : "",
          proofPoints: Array.isArray(brand.proofPoints) ? brand.proofPoints.join("\n") : "",
          guidelines: String(brand.guidelines ?? ""),
          colors: {
            background: colors.background ?? DEFAULT_BRAND_COLORS.background,
            primary: colors.primary ?? DEFAULT_BRAND_COLORS.primary,
            secondary: colors.secondary ?? DEFAULT_BRAND_COLORS.secondary,
            accent: colors.accent ?? DEFAULT_BRAND_COLORS.accent,
          },
          fonts: {
            heading: carouselFontFamily(fonts.heading),
            body: carouselFontFamily(fonts.body),
          },
          logoAssetId,
        });
        setLogoPreview(logoAssetId ? `/api/v1/assets/${logoAssetId}` : null);
        setStatus("ready");
        setLoaded(true);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load brand.");
        setStatus("error");
      }
  }, []);
  useEffect(() => {
    // Load the authenticated workspace's saved brand before enabling editing.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadBrand();
  }, [loadBrand]);

  function touch() {
    setDirty(true);
    setStatus((current) => (current === "saved" ? "ready" : current));
  }

  function field<K extends keyof BrandForm>(key: K) {
    return {
      value: form[key] as string,
      onChange: (event: { target: { value: string } }) => {
        touch();
        setForm((current) => ({ ...current, [key]: event.target.value }));
      },
    };
  }

  async function uploadLogo(file: File) {
    if (logoBusy) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setError("Choose a PNG, JPEG, or WebP image no larger than 8 MB.");
      return;
    }
    setLogoBusy(true);
    setError(null);
    const local = URL.createObjectURL(file);
    setLogoPreview((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return local;
    });
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await fetch("/api/v1/assets", { method: "POST", body: data });
      const body = (await response.json()) as { id?: string; message?: string };
      if (!response.ok || !body.id) throw new Error(body.message ?? "Could not upload the logo.");
      touch();
      setForm((current) => ({ ...current, logoAssetId: body.id! }));
      setLogoPreview(`/api/v1/assets/${body.id}`);
      URL.revokeObjectURL(local);
    } catch (uploadError) {
      URL.revokeObjectURL(local);
      setLogoPreview(form.logoAssetId ? `/api/v1/assets/${form.logoAssetId}` : null);
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload the logo.");
    } finally {
      setLogoBusy(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (status === "saving" || logoBusy || !loaded) return;
    if (!form.name.trim()) { setError("Enter your product name before saving."); return; }
    for (const key of COLOR_KEYS) {
      if (!normalizeHex(form.colors[key])) {
        setError(`${COLOR_COPY[key].label} needs a hex color like #171717.`);
        setStatus("error");
        return;
      }
    }
    setStatus("saving");
    setError(null);
    try {
      const response = await fetch("/api/v1/brand", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          audience: form.audience,
          positioning: form.positioning,
          tone: form.tone,
          cta: form.cta,
          website: form.website,
          wordsToUse: form.wordsToUse
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          wordsToAvoid: form.wordsToAvoid
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          proofPoints: form.proofPoints
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
          guidelines: form.guidelines,
          colors: {
            background: normalizeHex(form.colors.background),
            primary: normalizeHex(form.colors.primary),
            secondary: normalizeHex(form.colors.secondary),
            accent: normalizeHex(form.colors.accent),
          },
          fonts: form.fonts,
          logoAssetId: form.logoAssetId,
        }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Could not save.");
      setForm((current) => ({
        ...current,
        colors: {
          background: normalizeHex(current.colors.background) ?? current.colors.background,
          primary: normalizeHex(current.colors.primary) ?? current.colors.primary,
          secondary: normalizeHex(current.colors.secondary) ?? current.colors.secondary,
          accent: normalizeHex(current.colors.accent) ?? current.colors.accent,
        },
      }));
      setStatus("saved");
      setDirty(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save.");
      setStatus("error");
    }
  }

  if (status === "error" && !loaded) return <main id="main-content" className="mx-auto w-full max-w-xl px-6 py-12"><h1 className="text-3xl font-medium tracking-tight">Your brand kit didn’t load</h1><p className="mt-3 text-sm text-destructive" role="alert">{error}</p><p className="mt-2 text-sm text-ink-soft">Retry to load your saved settings before editing.</p><Button className="mt-5" onClick={() => void loadBrand()}>Try again</Button></main>;

  if (status === "loading") {
    return (
      <main id="main-content" className="mx-auto w-full max-w-[1200px] px-6 py-12">
        <div className="h-10 w-48 animate-pulse rounded-2xl bg-white" />
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="h-[640px] animate-pulse rounded-[24px] bg-white" />
          <div className="h-[640px] animate-pulse rounded-[24px] bg-white" />
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="mx-auto w-full max-w-[1200px] px-6 py-12">
      <PageIntro title="Brand kit">
        Start with your product and audience. Save once and your agent uses this context for new carousels.
      </PageIntro>
      <UnsavedChangesGuard dirty={dirty} />
      <Settle>
      <form onSubmit={onSubmit} className="mt-8">
        <fieldset disabled={status === "saving" || logoBusy} className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
        <section className="rounded-[24px] border border-black/8 bg-white p-6 sm:p-8">
          <h2 className="text-[18px] font-medium tracking-[-0.02em]">The essentials</h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">Product name is required. A short description and audience help your agent write a useful first draft.</p>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product name</Label>
              <Input id="name" autoComplete="organization" required maxLength={120} {...field("name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">What it is</Label>
              <Textarea id="description" placeholder="What does your product do, and what problem does it solve?" {...field("description")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audience">Audience</Label>
              <Input id="audience" placeholder="For example: founders at small software companies" {...field("audience")} />
            </div>
            <details className="rounded-2xl border border-border p-4">
              <summary className="min-h-11 cursor-pointer text-sm font-medium">More voice and writing settings</summary>
              <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="positioning">Positioning</Label>
              <Input id="positioning" {...field("positioning")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Input id="tone" placeholder="sharp, technical, direct" {...field("tone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cta">Default CTA</Label>
              <Input id="cta" {...field("cta")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" type="url" autoComplete="url" {...field("website")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="use">Words to use</Label>
              <Input id="use" placeholder="plainspoken, specific, practical" {...field("wordsToUse")} />
              <p className="text-[12px] font-light text-ink-faint">Comma separated.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="avoid">Words to avoid</Label>
              <Input id="avoid" placeholder="unlock, seamless, revolutionize" {...field("wordsToAvoid")} />
              <p className="text-[12px] font-light text-ink-faint">Comma separated.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="proof">Proof points</Label>
              <Textarea id="proof" {...field("proofPoints")} />
              <p className="text-[12px] font-light text-ink-faint">One per line.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="guidelines">Writing guidelines</Label>
              <Textarea id="guidelines" placeholder="Use short sentences. Lead with the customer problem. Never compare us to named competitors." {...field("guidelines")} />
              <p className="text-[12px] font-light text-ink-faint">These instructions are passed to every generation.</p>
            </div>
              </div>
            </details>
          </div>
        </section>

        <section className="rounded-[24px] border border-black/8 bg-white p-6 sm:p-8 lg:sticky lg:top-6">
          <h2 className="text-[18px] font-medium tracking-[-0.02em]">Visuals</h2>
          <SlidePreview form={form} logoSrc={logoPreview} />

          <fieldset className="mt-6 space-y-4">
            <legend className="text-sm font-medium tracking-[-0.01em]">Colors</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {COLOR_KEYS.map((key) => (
                <ColorField
                  key={key}
                  id={`color-${key}`}
                  label={COLOR_COPY[key].label}
                  hint={COLOR_COPY[key].hint}
                  value={form.colors[key]}
                  onChange={(value) => {
                    touch();
                    setForm((current) => ({
                      ...current,
                      colors: { ...current.colors, [key]: value },
                    }));
                  }}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-6 grid gap-4 sm:grid-cols-2">
            <legend className="col-span-full text-sm font-medium tracking-[-0.01em]">Fonts</legend>
            <FontField
              id="font-heading"
              label="Heading"
              value={form.fonts.heading}
              onChange={(heading) => {
                touch();
                setForm((current) => ({ ...current, fonts: { ...current.fonts, heading } }));
              }}
            />
            <FontField
              id="font-body"
              label="Body"
              value={form.fonts.body}
              onChange={(body) => {
                touch();
                setForm((current) => ({ ...current, fonts: { ...current.fonts, body } }));
              }}
            />
            <p className="col-span-full text-[12px] font-light text-ink-faint">
              Bundled fonts stay consistent in the editor, PNG images, and PDFs.
            </p>
          </fieldset>

          <div className="mt-6 space-y-2">
            <Label htmlFor="logo">Logo</Label>
            <input
              ref={fileRef}
              id="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void uploadLogo(file);
              }}
            />
            <div
              className="flex items-center gap-4 rounded-2xl border border-dashed border-black/15 bg-[#f7f7f6] p-4"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer.files[0];
                if (file) void uploadLogo(file);
              }}
            >
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/8 bg-white">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt="" className="size-full object-contain" />
                ) : (
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                    None
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-light text-ink-soft">
                  PNG, JPEG, or WebP. 8MB max.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" disabled={logoBusy} onClick={() => fileRef.current?.click()}>
                    {logoBusy ? "Uploading…" : logoPreview ? "Replace" : "Upload"}
                  </Button>
                  {form.logoAssetId ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        touch();
                        setForm((current) => ({ ...current, logoAssetId: null }));
                        setLogoPreview((current) => {
                          if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
                          return null;
                        });
                      }}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>
        </fieldset>

        <div className="sticky bottom-4 z-10 mt-5 flex flex-wrap items-center gap-4 rounded-[24px] border border-border bg-card p-4 shadow-sm">
          {error ? (
            <p className="w-full text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={status === "saving" || logoBusy}>
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Save brand"}
          </Button>
          <p role="status" className="text-sm text-ink-soft">{dirty ? "Unsaved changes" : status === "saved" ? "Brand kit saved. New carousels will use these settings." : "Changes apply to new carousels. Existing drafts keep their design."}</p>
          {status === "saved" ? <Link href="/connect" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium">Next: connect your agent <ArrowRight size={16} /></Link> : null}
        </div>
      </form>
      </Settle>
    </main>
  );
}

function SlidePreview({ form, logoSrc }: { form: BrandForm; logoSrc: string | null }) {
  return (
    <div
      className="mt-6 flex aspect-[4/5] max-h-[360px] flex-col rounded-xl border border-black/8 p-8"
      style={{ background: normalizeHex(form.colors.background) ?? form.colors.background }}
      aria-hidden
    >
      <div className="flex items-center justify-between">
        <p
          className="font-mono text-[11px] uppercase tracking-[0.14em]"
          style={{ color: normalizeHex(form.colors.accent) ?? form.colors.accent }}
        >
          Hook
        </p>
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} alt="" className="h-6 w-auto max-w-16 object-contain" />
        ) : null}
      </div>
      <p
        className="mt-auto text-[28px] font-medium leading-8 tracking-[-0.03em]"
        style={{
          color: normalizeHex(form.colors.primary) ?? form.colors.primary,
          fontFamily: form.fonts.heading,
        }}
      >
        {form.name || "Product name"}
      </p>
      <p
        className="mt-2 line-clamp-3 text-[14px] font-light leading-5"
        style={{
          color: normalizeHex(form.colors.secondary) ?? form.colors.secondary,
          fontFamily: form.fonts.body,
        }}
      >
        {form.description || "What the product is, in the body font."}
      </p>
    </div>
  );
}

function ColorField({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const valid = normalizeHex(value);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        <label className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-black/10">
          <span className="sr-only">Pick {label}</span>
          <input
            type="color"
            value={valid ?? "#000000"}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            className="absolute -inset-2 h-[calc(100%+16px)] w-[calc(100%+16px)] cursor-pointer border-0 p-0"
          />
        </label>
        <Input
          id={id}
          value={value}
          spellCheck={false}
          autoCapitalize="characters"
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => {
            if (valid) onChange(valid);
          }}
          className="font-mono uppercase"
          required
        />
      </div>
      <p className="text-[12px] font-light text-ink-faint">{hint}</p>
    </div>
  );
}

function FontField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const choices = (FONT_CHOICES as readonly string[]).includes(value)
    ? FONT_CHOICES
    : [value, ...FONT_CHOICES];
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
        style={{ fontFamily: value }}
      >
        {choices.map((font) => (
          <option key={font} value={font} style={{ fontFamily: font }}>
            {font}
          </option>
        ))}
      </select>
    </div>
  );
}
