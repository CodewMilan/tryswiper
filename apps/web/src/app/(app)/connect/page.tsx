"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AgentConfigs } from "@/components/agent-configs";
import { PageIntro, Settle } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { Copy, Check, ArrowRight } from "@phosphor-icons/react";

const FIRST_PROMPT = "Use Swiper to read my brand kit and create a carousel explaining the main problem my product solves. Choose a suitable story format, write clear original copy, run quality checks, and give me the editor link to review it.";

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
  const [revokeTarget, setRevokeTarget] = useState<KeyRow | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyError(null);
      setCopied(label);
      window.setTimeout(() => setCopied((current) => current === label ? null : current), 2000);
    } catch { setCopyError("Could not copy. Select the text and copy it manually."); }
  }

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
    if (minting) return;
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
    if (revoking) return;
    setRevoking(true);
    setRevokeError(null);
    try {
      const response = await fetch(`/api/v1/mcp-keys/${id}`, { method: "DELETE" });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Could not revoke the key.");
      if (freshKeyId === id) {
        setFreshKey(null);
        setFreshKeyId(null);
      }
      await load();
      setRevokeTarget(null);
    } catch (revokeError) {
      setRevokeError(revokeError instanceof Error ? revokeError.message : "Could not revoke the key.");
    } finally {
      setRevoking(false);
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3100";
  const activeKeys = keys.filter((key) => !key.revokedAt);

  return (
    <main className="mx-auto w-full max-w-[800px] px-6 py-12">
      <PageIntro title="Connect an agent">
        Create a private key, choose your AI client, and ask for your first post. Your carousels stay in the{" "}
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
          <p role="alert" className="text-sm text-destructive">{error}</p>
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
              This key lets your agent access your workspace. Copy it somewhere private; you only see the full value once.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={() => void mintKey()} disabled={minting}>
                {minting ? "Minting…" : activeKeys.length ? "Mint a new key" : "Mint API key"}
              </Button>
            </div>
            {freshKey ? (
              <div className="mt-4 space-y-2">
                <Label htmlFor="fresh-key">New key</Label>
                <Input id="fresh-key" readOnly value={freshKey} />
                <Button variant="outline" onClick={() => void copy("key", freshKey)}>{copied === "key" ? <Check size={16} /> : <Copy size={16} />}{copied === "key" ? "Key copied" : "Copy private key"}</Button>
                <p className="text-xs leading-5 text-ink-soft">Save this key before leaving or refreshing this page.</p>
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
                      <span className="min-w-0 break-words">{key.name} · {key.keyPrefix}… · {key.lastUsedAt ? "Agent has connected" : "Waiting for first connection"}</span>
                      <button type="button" onClick={() => { setRevokeError(null); setRevokeTarget(key); }} className="min-h-11 shrink-0 rounded-lg px-2 py-1 font-medium text-destructive hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Revoke</button>
                    </li>
                  ))
              )}
            </ul>
          </section>

          <div>
            <h2 className="text-[18px] font-medium tracking-[-0.02em]">2. Add the agent</h2>
            <p className="mt-2 mb-4 text-[15px] font-light leading-6 text-ink-soft">
              Use your saved key with the setup snippets below, or mint a new key for complete configs.
              Choose the client you use and follow its instructions.
            </p>
            <AgentConfigs origin={origin} apiKey={freshKey} savedKeyPrefix={activeKeys[0]?.keyPrefix ?? null} />
          </div>
          <section id="first-prompt" className="scroll-mt-8 rounded-[24px] border border-border bg-card p-6 sm:p-8">
            <h2 className="text-lg font-medium tracking-tight">3. Ask for your first carousel</h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">Open a new conversation in your agent and paste this prompt. Your agent returns a link to the editable draft.</p>
            <p className="mt-4 rounded-2xl bg-secondary p-4 text-sm leading-6">{FIRST_PROMPT}</p>
            <div className="mt-4 flex flex-wrap gap-3"><Button variant="outline" onClick={() => void copy("prompt", FIRST_PROMPT)}>{copied === "prompt" ? "Prompt copied" : "Copy first prompt"}</Button><Button variant="ghost" onClick={() => void load()}>Check connection</Button></div>
            <p role="status" className="mt-3 text-sm text-ink-soft">{activeKeys.some((key) => key.lastUsedAt) ? "An agent has used your key. You’re ready to create." : "We’ll confirm the connection after your agent makes its first request."}</p>
            <Link href="/library" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium">Open your library <ArrowRight size={16} /></Link>
          </section>
          {copyError ? <p role="alert" className="text-sm text-destructive">{copyError}</p> : null}
        </Settle>
      ) : null}
      <Dialog open={!!revokeTarget} onOpenChange={(open) => { if (!open && !revoking) setRevokeTarget(null); }} title="Revoke this agent key?" description={`Clients using ${revokeTarget?.keyPrefix ?? "this key"}… will lose access immediately. Your saved carousels stay in your library. Create a new key to reconnect.`}>
        {revokeError ? <p role="alert" className="mb-4 text-sm text-destructive">{revokeError}</p> : null}
        <div className="flex gap-3"><Button disabled={revoking} onClick={() => { if (revokeTarget) void revokeKey(revokeTarget.id); }}>{revoking ? "Revoking…" : "Revoke key"}</Button><Button variant="outline" disabled={revoking} onClick={() => setRevokeTarget(null)}>Cancel</Button></div>
      </Dialog>
    </main>
  );
}
