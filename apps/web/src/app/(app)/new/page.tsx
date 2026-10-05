"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FORMATS } from "@swiper/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const formats = [...FORMATS].sort((a, b) => {
  if (a.id === "freeform") return -1;
  if (b.id === "freeform") return 1;
  return 0;
});

export default function NewCarouselPage() {
  const router = useRouter();
  const [formatId, setFormatId] = useState("freeform");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const selected = useMemo(
    () => formats.find((format) => format.id === formatId) ?? formats[0],
    [formatId],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/carousels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format_id: selected.id,
          title: title.trim() || undefined,
        }),
      });
      const body = (await response.json()) as { carousel_id?: string; message?: string };
      if (!response.ok || !body.carousel_id) {
        throw new Error(body.message ?? "Could not start the carousel.");
      }
      router.push(`/c/${body.carousel_id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not start the carousel.");
      setPending(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1100px] px-6 py-12">
      <h1 className="text-[36px] font-light leading-tight tracking-[-0.03em] text-black">
        New carousel
      </h1>
      <p className="mt-2 max-w-xl text-[16px] font-light text-ink-soft">
        Pick a format and open it in the editor. Each slide starts with a placeholder line you
        rewrite. No agent required.
      </p>

      <form onSubmit={onSubmit} className="mt-8">
        <div className="max-w-md">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={selected?.name ?? "Untitled carousel"}
            maxLength={120}
            className="mt-2"
            autoComplete="off"
          />
          <p className="mt-2 text-sm text-ink-faint">
            Leave this blank to use the format name. Colors and the heading font come from your
            brand kit.
          </p>
        </div>

        <fieldset className="mt-8">
          <legend className="text-sm font-medium tracking-[-0.01em] text-foreground">Format</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {formats.map((format) => {
              const checked = format.id === formatId;
              return (
                <label
                  key={format.id}
                  className={`cursor-pointer rounded-[24px] border bg-white p-5 motion-safe:transition-[border-color,box-shadow] motion-safe:duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background ${
                    checked
                      ? "border-black shadow-[0_8px_20px_-12px_rgba(0,0,0,0.45)]"
                      : "border-black/8 hover:border-black/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="format"
                    value={format.id}
                    checked={checked}
                    onChange={() => setFormatId(format.id)}
                    className="sr-only"
                  />
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-[16px] font-medium tracking-[-0.02em] text-black">
                      {format.name}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">
                      {format.slides.length} slides
                    </span>
                  </span>
                  <span className="mt-2 block text-sm font-light leading-6 text-ink-soft">
                    {format.description}
                  </span>
                  <span className="mt-3 block font-mono text-[12px] leading-5 text-ink-faint">
                    {format.slides.map((slide) => slide.role).join(" · ")}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {error ? (
          <p className="mt-6 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex items-center gap-4">
          <Button type="submit" disabled={pending || !selected}>
            {pending ? "Opening…" : "Open in the editor"}
          </Button>
          <p className="text-sm text-ink-faint">
            {selected ? `${selected.slides.length} slides, ready to edit.` : null}
          </p>
        </div>
      </form>
    </main>
  );
}
