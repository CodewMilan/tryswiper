"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AgentConfigs } from "@/components/agent-configs";
import { PageIntro, Settle } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type KeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};
async function readWorkspace() {
  const keysRes = await fetch("/api/v1/mcp-keys");
  if (!keysRes.ok) throw new Error("Could not load your agent keys.");
  const keysJson = (await keysRes.json()) as { keys: KeyRow[] };
  return { keys: keysJson.keys };
}

export default function ConnectPage() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [freshKeyId, setFreshKeyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const next = await readWorkspace();
      setKeys(next.keys);
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
        setKeys(next.keys);
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
        body: JSON.stringify({ name: "Agent" }),
      });
      const body = (await response.json()) as { id?: string; key?: string; message?: string };
      if (!response.ok || !body.key) {
        throw new Error(body.message ?? "Could not mint a key.");
      }
      setFreshKey(body.key);
      setFreshKeyId(body.id ?? null);
      await load();
    } catch (mintError) {
      setError(mintError instanceof Error ? mintError.message : "Could not mint a key.");
    } finally {
      setMinting(false);
    }
  }

  async function revokeKey(id: string) {
    setError(null);
    try {
      const response = await fetch(`/api/v1/mcp-keys/${id}`, { method: "DELETE" });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Could not revoke the key.");
      if (freshKeyId === id) {
        setFreshKey(null);
        setFreshKeyId(null);
      }
      await load();
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "Could not revoke the key.");
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3100";

  return (
    <main className="mx-auto w-full max-w-[800px] px-6 py-12">
      <PageIntro title="Connect an agent">
        Mint a key, then add Swiper to Cursor, Claude, or ChatGPT. Your carousels stay in the{" "}
        <Link href="/library" className="text-black underline decoration-black/20 underline-offset-4 motion-safe:transition-colors motion-safe:duration-150 hover:text-accent hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">library</Link>.
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
            <h2 className="text-[18px] font-medium tracking-[-0.02em]">1. Create a private key</h2>
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
                    <li key={key.id} className="flex min-h-10 items-center justify-between gap-4 rounded-xl bg-[#f7f7f6] px-3 py-2">
                      <span>{key.name} · {key.keyPrefix}… · {key.lastUsedAt ? "used" : "never used"}</span>
                      <button type="button" onClick={() => void revokeKey(key.id)} className="shrink-0 rounded-lg px-2 py-1 font-medium text-destructive hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Revoke</button>
                    </li>
                  ))
              )}
            </ul>
          </section>

          <div>
            <h2 className="text-[18px] font-medium tracking-[-0.02em]">2. Add the agent</h2>
            <p className="mt-2 mb-4 text-[15px] font-light leading-6 text-ink-soft">
              Mint a key first so these configs include it. Then ask: “Make a carousel explaining why we’re different.”
            </p>
            <AgentConfigs origin={origin} apiKey={freshKey} />
          </div>
        </Settle>
      ) : null}
    </main>
  );
}
