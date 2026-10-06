"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageIntro, Settle } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Brand = { name?: string; description?: string; audience?: string } | null;
type KeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};
type CarouselRow = {
  id: string;
  title: string;
  status: string;
  format_id: string;
  editor_url: string;
};

async function readWorkspace() {
  const [brandRes, keysRes, projectsRes] = await Promise.all([
    fetch("/api/v1/brand"),
    fetch("/api/v1/mcp-keys"),
    fetch("/api/v1/projects"),
  ]);
  if (!brandRes.ok || !keysRes.ok || !projectsRes.ok) {
    throw new Error("Could not load workspace.");
  }
  const brandJson = (await brandRes.json()) as { brand: Brand };
  const keysJson = (await keysRes.json()) as { keys: KeyRow[] };
  const projectsJson = (await projectsRes.json()) as { carousels: CarouselRow[] };
  return {
    brand: brandJson.brand,
    keys: keysJson.keys,
    carousels: projectsJson.carousels ?? [],
  };
}

function mcpConfig(origin: string, key: string) {
  return `{
  "mcpServers": {
    "swiper": {
      "command": "pnpm",
      "args": ["--filter", "@swiper/mcp", "start"],
      "env": {
        "SWIPER_API_URL": "${origin}",
        "SWIPER_API_KEY": "${key}"
      }
    }
  }
}`;
}

export default function ConnectPage() {
  const [brand, setBrand] = useState<Brand>(null);
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [carousels, setCarousels] = useState<CarouselRow[]>([]);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const next = await readWorkspace();
      setBrand(next.brand);
      setKeys(next.keys);
      setCarousels(next.carousels);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load workspace.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void readWorkspace()
      .then((next) => {
        if (cancelled) return;
        setBrand(next.brand);
        setKeys(next.keys);
        setCarousels(next.carousels);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Could not load workspace.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function mintKey() {
    setMinting(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/mcp-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Cursor" }),
      });
      const body = (await response.json()) as { key?: string; message?: string };
      if (!response.ok || !body.key) {
        throw new Error(body.message ?? "Could not mint a key.");
      }
      setFreshKey(body.key);
      await load();
    } catch (mintError) {
      setError(mintError instanceof Error ? mintError.message : "Could not mint a key.");
    } finally {
      setMinting(false);
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3100";
  const snippet = useMemo(
    () => mcpConfig(origin, freshKey ?? "sk_swiper_YOUR_KEY"),
    [freshKey, origin],
  );

  return (
    <main className="mx-auto w-full max-w-[800px] px-6 py-12">
      <PageIntro title="Connect an agent">
        Mint a key, add Swiper to Cursor or Claude, then ask for a carousel. Or{" "}
        <Link href="/new" className="text-black underline decoration-black/20 underline-offset-4 motion-safe:transition-colors motion-safe:duration-150 hover:text-accent hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          start one in the browser
        </Link>.
      </PageIntro>

      {loading ? (
        <div className="mt-8 space-y-4" aria-busy="true">
          <div className="h-36 animate-pulse rounded-[24px] bg-white" />
          <div className="h-48 animate-pulse rounded-[24px] bg-white" />
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-[24px] border border-black/8 bg-white p-6">
          <p className="text-sm text-destructive">{error}</p>
          <Button className="mt-4" variant="outline" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      {!loading ? (
        <Settle className="mt-8 space-y-4">
          <section className="rounded-[24px] border border-black/8 bg-white p-6 sm:p-8">
            <h2 className="text-[18px] font-medium tracking-[-0.02em]">1. Brand kit</h2>
            <p className="mt-2 text-[15px] font-light leading-6 text-ink-soft">
              {brand?.description
                ? `${brand.name ?? "Product"} is ready for the agent.`
                : "Add a product description so the agent is not guessing."}
            </p>
            <Link
              href="/brand"
              className="mt-5 inline-flex min-h-10 items-center rounded-[14px] border border-black/10 bg-white px-4 text-sm font-medium motion-safe:transition-colors motion-safe:duration-150 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {brand?.description ? "Edit brand" : "Add brand context"}
            </Link>
          </section>

          <section className="rounded-[24px] border border-black/8 bg-white p-6 sm:p-8">
            <h2 className="text-[18px] font-medium tracking-[-0.02em]">2. MCP key</h2>
            <p className="mt-2 text-[15px] font-light leading-6 text-ink-soft">
              Keys are hashed at rest. You only see the full value once.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={() => void mintKey()} disabled={minting}>
                {minting ? "Minting…" : "Mint API key"}
              </Button>
            </div>
            {freshKey ? (
              <div className="mt-4 space-y-2">
                <Label htmlFor="fresh-key">New key</Label>
                <Input id="fresh-key" readOnly value={freshKey} />
              </div>
            ) : null}
            <ul className="mt-4 space-y-2 text-[14px] font-light text-ink-soft">
              {keys.filter((key) => !key.revokedAt).length === 0 ? (
                <li>No active keys yet.</li>
              ) : (
                keys
                  .filter((key) => !key.revokedAt)
                  .map((key) => (
                    <li key={key.id}>
                      {key.name} · {key.keyPrefix}…{" "}
                      {key.lastUsedAt ? "used" : "never used"}
                    </li>
                  ))
              )}
            </ul>
          </section>

          <section className="rounded-[24px] border border-black/8 bg-white p-6 sm:p-8">
            <h2 className="text-[18px] font-medium tracking-[-0.02em]">3. Cursor config</h2>
            <p className="mt-2 text-[15px] font-light leading-6 text-ink-soft">
              Run Cursor from the Swiper repo root. API URL is {origin}.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-2xl bg-[#f7f7f6] p-4 font-mono text-[12px] leading-6 text-black">
              {snippet}
            </pre>
            <Button
              className="mt-3"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(snippet);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copied" : "Copy config"}
            </Button>
            <p className="mt-4 text-[14px] font-light text-ink-soft">
              Then ask: “Make a carousel explaining why we’re different.”
            </p>
          </section>

          <section className="rounded-[24px] border border-black/8 bg-white p-6 sm:p-8">
            <h2 className="text-[18px] font-medium tracking-[-0.02em]">Recent carousels</h2>
            {carousels.length === 0 ? (
              <p className="mt-2 text-[15px] font-light leading-6 text-ink-soft">
                None yet.{" "}
                <Link href="/new" className="text-black underline decoration-black/20 underline-offset-4 motion-safe:transition-colors motion-safe:duration-150 hover:text-accent hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Start one from a format
                </Link>
                , or wait for the agent.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {carousels.map((carousel) => (
                  <li key={carousel.id}>
                    <Link
                      href={`/c/${carousel.id}`}
                      className="flex min-h-11 items-center justify-between rounded-2xl px-3 py-2 text-[15px] font-light motion-safe:transition-colors motion-safe:duration-150 hover:bg-[#f7f7f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="text-black">{carousel.title}</span>
                      <span className="font-mono text-[12px] text-ink-faint">{carousel.format_id}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </Settle>
      ) : null}
    </main>
  );
}
