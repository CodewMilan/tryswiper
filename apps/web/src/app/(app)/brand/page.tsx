"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type BrandForm = {
  name: string;
  description: string;
  audience: string;
  positioning: string;
  tone: string;
  cta: string;
  website: string;
  wordsToAvoid: string;
  proofPoints: string;
};

const empty: BrandForm = {
  name: "",
  description: "",
  audience: "",
  positioning: "",
  tone: "",
  cta: "",
  website: "",
  wordsToAvoid: "",
  proofPoints: "",
};

export default function BrandPage() {
  const [form, setForm] = useState<BrandForm>(empty);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "saved" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/v1/brand");
        const body = (await response.json()) as {
          brand?: Record<string, unknown>;
          message?: string;
        };
        if (!response.ok) throw new Error(body.message ?? "Could not load brand.");
        const brand = body.brand ?? {};
        setForm({
          name: String(brand.name ?? ""),
          description: String(brand.description ?? ""),
          audience: String(brand.audience ?? ""),
          positioning: String(brand.positioning ?? ""),
          tone: String(brand.tone ?? ""),
          cta: String(brand.cta ?? ""),
          website: String(brand.website ?? ""),
          wordsToAvoid: Array.isArray(brand.wordsToAvoid)
            ? brand.wordsToAvoid.join(", ")
            : "",
          proofPoints: Array.isArray(brand.proofPoints) ? brand.proofPoints.join("\n") : "",
        });
        setStatus("ready");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load brand.");
        setStatus("error");
      }
    })();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setError(null);
    try {
      const response = await fetch("/api/v1/brand", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          wordsToAvoid: form.wordsToAvoid
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          proofPoints: form.proofPoints
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? "Could not save.");
      }
      setStatus("saved");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save.");
      setStatus("error");
    }
  }

  function field<K extends keyof BrandForm>(key: K) {
    return {
      value: form[key],
      onChange: (
        event: { target: { value: string } },
      ) => setForm((current) => ({ ...current, [key]: event.target.value })),
    };
  }

  if (status === "loading") {
    return (
      <main className="mx-auto w-full max-w-xl px-6 py-12">
        <div className="h-8 w-40 animate-pulse rounded-xl bg-secondary" />
        <div className="mt-6 h-96 animate-pulse rounded-xl bg-secondary" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12">
      <h1 className="text-[36px] font-light leading-tight tracking-[-0.03em] text-black">Brand kit</h1>
      <p className="mt-2 text-[16px] font-light text-ink-soft">
        The agent receives a compact version of this, not your whole database.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Product name</Label>
          <Input id="name" autoComplete="organization" required {...field("name")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">What it is</Label>
          <Textarea id="description" required {...field("description")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="audience">Audience</Label>
          <Input id="audience" {...field("audience")} />
        </div>
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
          <Label htmlFor="avoid">Words to avoid (comma separated)</Label>
          <Input id="avoid" {...field("wordsToAvoid")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="proof">Proof points (one per line)</Label>
          <Textarea id="proof" {...field("proofPoints")} />
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Save brand"}
        </Button>
      </form>
    </main>
  );
}
