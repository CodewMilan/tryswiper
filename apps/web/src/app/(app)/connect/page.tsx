"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      setBrand(brandJson.brand);
      setKeys(keysJson.keys);
      setCarousels(projectsJson.carousels ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load workspace.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
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

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const snippet = useMemo(
    () => mcpConfig(origin, freshKey ?? "sk_swiper_YOUR_KEY"),
    [freshKey, origin],
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Connect an agent</h1>
      <p className="mt-2 text-muted-foreground">
        This is the product. Mint a key, add Swiper to Cursor or Claude, then ask for a carousel.
      </p>

      {loading ? (
        <div className="mt-8 space-y-4" aria-busy="true">
          <div className="h-32 animate-pulse rounded-xl bg-secondary" />
          <div className="h-48 animate-pulse rounded-xl bg-secondary" />
        </div>
      ) : null}

      {error ? (
        <Card className="mt-6 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button className="mt-3" variant="outline" onClick={() => void load()}>
            Retry
          </Button>
        </Card>
      ) : null}

      {!loading ? (
        <div className="mt-8 space-y-6">
          <Card className="p-5">
            <h2 className="font-medium">1. Brand kit</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {brand?.description
                ? `${brand.name ?? "Product"} is ready for the agent.`
                : "Add a product description so the agent is not guessing."}
            </p>
            <Link
              href="/brand"
              className="mt-4 inline-flex min-h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {brand?.description ? "Edit brand" : "Add brand context"}
            </Link>
          </Card>

          <Card className="p-5">
            <h2 className="font-medium">2. MCP key</h2>
            <p className="mt-2 text-sm text-muted-foreground">
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
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
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
          </Card>

          <Card className="p-5">
            <h2 className="font-medium">3. Cursor config</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Run Cursor from the Swiper repo root. API URL is {origin}.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-lg bg-secondary p-4 text-xs leading-6">
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
            <p className="mt-4 text-sm text-muted-foreground">
              Then ask: “Make a carousel explaining why we’re different.”
            </p>
          </Card>

          <section>
            <h2 className="font-medium">Recent carousels</h2>
            {carousels.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                None yet. They appear here after the agent generates one.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {carousels.map((carousel) => (
                  <li key={carousel.id}>
                    <Link
                      href={`/c/${carousel.id}`}
                      className="flex min-h-10 items-center justify-between rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span>{carousel.title}</span>
                      <span className="text-muted-foreground">{carousel.format_id}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}
