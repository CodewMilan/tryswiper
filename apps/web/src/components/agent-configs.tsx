"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

function cursorInstallHref(origin: string, key: string) {
  const config = JSON.stringify({
    url: `${origin}/mcp`,
    headers: { Authorization: `Bearer ${key}` },
  });
  const encoded = btoa(config).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=swiper&config=${encoded}`;
}

export function AgentConfigs({ origin, apiKey, savedKeyPrefix }: { origin: string; apiKey: string | null; savedKeyPrefix: string | null }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const usableKey = apiKey ?? "YOUR_SAVED_KEY";
  const mcpUrl = `${origin}/mcp`;
  const localConfig = useMemo(
    () =>
      JSON.stringify(
        {
          mcpServers: {
            swiper: {
              command: "pnpm",
              args: ["--filter", "@swiper/mcp", "start"],
              env: {
                SWIPER_API_URL: origin,
                SWIPER_API_KEY: usableKey,
              },
            },
          },
        },
        null,
        2,
      ),
    [usableKey, origin],
  );
  const cards = useMemo(
    () => [
      {
        id: "cursor",
        title: "Cursor",
        body: "Settings → MCP, or install it on this machine. Cursor sends the key as a header.",
        config: JSON.stringify(
          {
            mcpServers: {
              swiper: {
                url: mcpUrl,
                headers: { Authorization: `Bearer ${usableKey}` },
              },
            },
          },
          null,
          2,
        ),
        copy: apiKey ? "Copy Cursor config" : "Copy Cursor template",
        href: apiKey ? cursorInstallHref(origin, apiKey) : null,
        hrefLabel: "Add to Cursor",
      },
      {
        id: "claude",
        title: "Claude",
        body: "Add a custom connector in Claude Desktop or claude.ai. Use the URL, and the Authorization header if it asks. The JSON is for claude_desktop_config.json.",
        config: `URL\n${mcpUrl}\n\nHeader\nAuthorization: Bearer ${usableKey}\n\n${JSON.stringify(
          {
            mcpServers: {
              swiper: {
                type: "http",
                url: mcpUrl,
                headers: { Authorization: `Bearer ${usableKey}` },
              },
            },
          },
          null,
          2,
        )}`,
        copy: apiKey ? "Copy Claude config" : "Copy Claude template",
      },
      {
        id: "chatgpt",
        title: "ChatGPT",
        body: "Create an app or developer-mode connector, set authentication to None, and paste this URL. ChatGPT does not send a custom header, so the key stays in the URL.",
        config: `${mcpUrl}?key=${encodeURIComponent(usableKey)}`,
        copy: apiKey ? "Copy ChatGPT URL" : "Copy ChatGPT URL template",
      },
    ],
    [usableKey, mcpUrl, origin, apiKey],
  );

  async function copy(id: string, value: string) {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      window.setTimeout(() => {
        setCopied((current) => (current === id ? null : current));
      }, 1500);
    } catch {
      setCopyError("Could not copy. Select and copy the snippet above instead.");
    }
  }

  if (!apiKey && !savedKeyPrefix) {
    return (
      <div className="rounded-[24px] border border-dashed border-black/15 bg-white p-6 sm:p-8">
        <h2 className="text-[18px] font-medium tracking-[-0.02em]">Mint a key to connect your agent</h2>
        <p className="mt-2 max-w-xl text-[15px] font-light leading-6 text-ink-soft">
          Swiper never inserts a fake secret into a connector URL. Mint a key above, copy it once, then install the client you use.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!apiKey ? (
        <div className="rounded-[24px] border border-black/8 bg-white p-6 text-[15px] font-light leading-6 text-ink-soft">
          Your key {savedKeyPrefix}… is active, but its secret was shown only once. These are setup templates:
          replace YOUR_SAVED_KEY with the secret you saved. If you no longer have it, mint a new key above
          to get complete configs. Revoke the old key if you no longer use it.
        </div>
      ) : null}
      {copyError ? <p role="alert" className="text-sm text-destructive">{copyError}</p> : null}
      {cards.map((card) => (
        <section key={card.id} className="rounded-[24px] border border-black/8 bg-white p-6 sm:p-8">
          <h2 className="text-[18px] font-medium tracking-[-0.02em]">{card.title}</h2>
          <p className="mt-2 text-[15px] font-light leading-6 text-ink-soft">{card.body}</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-[#f7f7f6] p-4 font-mono text-[12px] leading-6 text-black">
            {card.config}
          </pre>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => void copy(card.id, card.config)}>
              {copied === card.id ? "Copied" : card.copy}
            </Button>
            {"href" in card && card.href ? (
              <a
                href={card.href}
                className="inline-flex min-h-10 items-center rounded-[14px] border border-black/10 bg-white px-4 text-sm font-medium motion-safe:transition-colors motion-safe:duration-150 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {card.hrefLabel}
              </a>
            ) : null}
          </div>
          {card.id === "chatgpt" ? (
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              Keep this URL private: the ?key= value is your secret. Anyone with the full URL can access
              your workspace. Do not share it or include it in screenshots.
            </p>
          ) : null}
        </section>
      ))}
      <details className="rounded-[24px] border border-black/8 bg-white p-6 sm:p-8">
        <summary className="cursor-pointer text-[18px] font-medium tracking-[-0.02em]">
          Local process, from this repo
        </summary>
        <p className="mt-2 text-[15px] font-light leading-6 text-ink-soft">
          Cursor or Claude Desktop can launch the MCP process when this repo is the working directory.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-[#f7f7f6] p-4 font-mono text-[12px] leading-6 text-black">
          {localConfig}
        </pre>
        <Button className="mt-3" variant="secondary" onClick={() => void copy("local", localConfig)}>
          {copied === "local" ? "Copied" : apiKey ? "Copy local config" : "Copy local template"}
        </Button>
      </details>
      <p className="text-[14px] font-light leading-6 text-ink-soft">
        Cursor and Claude Desktop on this computer can use {origin}. Claude.ai and ChatGPT need this origin to be public https.
      </p>
    </div>
  );
}
