"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { FORMATS } from "@swiper/schema";
import { ArrowRight } from "@/components/icons";
import { FormatRail } from "@/components/format-rail";
import { Magnetic } from "@/components/motion/magnetic";
import { FadeUp, SoftBlurIn } from "@/components/motion/soft-blur-in";
import { SpotlightCard } from "@/components/motion/spotlight-card";

/* ─────────────────────────────────────────────────────────
 * PAGE CONTENT STORYBOARD
 *
 * Static shell (nav) never re-animates.
 *
 *    0ms   headline words blur-in
 *  280ms   subcopy lifts
 *  420ms   primary CTA
 *  560ms   product stage
 * ───────────────────────────────────────────────────────── */

const TIMING = {
  copy: 280,
  cta: 420,
  stage: 560,
};

const linkClass =
  "rounded-sm text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const ctaClass =
  "group inline-flex items-center gap-2 rounded-[14px] bg-black px-[17px] py-[9px] text-[16px] font-medium tracking-[-0.01em] text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] motion-safe:transition-[transform,box-shadow,opacity] motion-safe:duration-150 hover:opacity-90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function Landing() {
  const [stage, setStage] = useState(0);
  const formats = FORMATS.slice(0, 6).map((format) => ({
    id: format.id,
    name: format.name,
    description: format.description,
    count: `${format.slideCount.min}–${format.slideCount.max} slides`,
    hook: format.slides[0]?.job ?? "Open with a reason to swipe.",
  }));

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStage(1), TIMING.copy),
      window.setTimeout(() => setStage(2), TIMING.cta),
      window.setTimeout(() => setStage(3), TIMING.stage),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div>
      <section className="hero-grid relative px-4 pb-16 pt-24 sm:px-8 sm:pt-28">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
        <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[24px] border border-black/8 border-b-2 bg-white px-5 pb-0 pt-16 sm:px-10 sm:pt-24">
          <div className="mx-auto flex max-w-[800px] flex-col items-center text-center">
            <h1 className="text-[40px] font-light leading-[1.05] tracking-[-0.03em] text-black sm:text-[52px] lg:text-[59px] lg:leading-[60.8px]">
              <SoftBlurIn
                segments={[
                  { text: "Describe the post. Your " },
                  { text: "agent", accent: true },
                ]}
              />
              <br />
              <SoftBlurIn
                delay={TIMING.copy / 1000}
                segments={[
                  { text: "builds", accent: true },
                  { text: " the carousel." },
                ]}
              />
            </h1>
            <FadeUp show={stage >= 1} className="mt-5 max-w-[540px]">
              <p className="text-[18px] font-light leading-[27px] tracking-[-0.01em] text-[#8f8f8f] sm:text-[20px]">
                Connect Swiper in Cursor, Claude, or ChatGPT. The agent reads your brand,
                picks a format, and hands you an editor link.
              </p>
            </FadeUp>
            <FadeUp show={stage >= 2} className="mt-6">
              <Magnetic>
                <Link href="/signup" className={ctaClass}>
                  Start for free
                  <ArrowRight className="motion-safe:transition-transform motion-safe:duration-150 group-hover:translate-x-0.5" />
                </Link>
              </Magnetic>
              <p className="mt-3 text-[13px] font-light tracking-[-0.01em] text-ink-soft">
                Free to start • No card required
              </p>
            </FadeUp>
          </div>
          <FadeUp show={stage >= 3} y={18}>
            <HeroStage />
          </FadeUp>
        </div>
      </section>

      <section id="product" className="scroll-mt-24 px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="max-w-[1100px] text-[32px] font-light leading-[1.15] tracking-[-0.02em] text-black sm:text-[44px] sm:leading-[52px]">
            The pieces that turn a brief into a post{" "}
            <Word icon="agent" color="text-blue">
              Agent
            </Word>{" "}
            <Word icon="format" color="text-pink">
              Format
            </Word>
            <br />
            <Word icon="slides" color="text-green">
              Slides
            </Word>{" "}
            <Word icon="export" color="text-accent">
              Export
            </Word>
          </h2>
          <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-12">
            <FeaturePoint
              title="A real document"
              body="The agent returns a typed carousel. Not a screenshot, and not a pile of HTML."
            />
            <FeaturePoint
              title="You approve the line"
              body="Shorten the hook. Swap the proof. The editor is the review step."
            />
            <FeaturePoint
              title="Export matches the editor"
              body="The same document renders in both places, so the file you download is the one you approved."
            />
          </div>
        </div>
      </section>

      <section className="px-4 pb-8 sm:px-8">
        <div className="mx-auto grid max-w-[1200px] gap-4">
          <FeatureCard
            id="editor"
            eyebrow="Editor"
            eyebrowClass="bg-[#bbe2f5] text-blue"
            title="Edit the slide the agent just wrote"
            body="Open the link, change the line, and ask for another pass on that slide only."
            href="/signup"
          >
            <EditorMock />
          </FeatureCard>
          <div className="grid gap-4 lg:grid-cols-2">
            <FeatureCard
              id="formats"
              eyebrow="Formats"
              eyebrowClass="bg-[#f8d4e4] text-pink"
              title="Start from a structure that already works"
              body="Problem, list, before and after, myth. The agent adapts the format to your product."
              href="/#formats"
            >
              <FormatMock />
            </FeatureCard>
            <FeatureCard
              id="brand"
              eyebrow="Brand"
              eyebrowClass="bg-[#d7f3e4] text-green"
              title="Give the agent a brand kit, not a vibe"
              body="Name, audience, tone, proof, and the words you will not say."
              href="/signup"
            >
              <BrandMock />
            </FeatureCard>
          </div>
          <FeatureCard
            id="agents"
            eyebrow="Agent"
            eyebrowClass="bg-[#ffd9cf] text-accent"
            title="Ask in the chat you already have open"
            body="Mint a key, paste one config, and tell the agent what the post is for."
            href="/signup"
            wide
          >
            <AgentMock />
          </FeatureCard>
        </div>
      </section>

      <section id="document" className="scroll-mt-24 px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-[1368px] rounded-[28px] bg-panel px-4 py-4 text-white sm:px-6 sm:py-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="px-4 py-8 sm:px-8 sm:py-10">
              <h2 className="text-[32px] font-light leading-[1.2] tracking-[-0.02em] sm:text-[36px] sm:leading-[43px]">
                Typed, reviewable,
                <br />
                <span className="text-yellow">and the same every time</span>
              </h2>
              <p className="mt-4 max-w-md text-[18px] font-light leading-7 text-[#cfcfcf]">
                Generation is a list of operations on a carousel document. You can read it,
                edit it, and export it without guessing what changed.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Magnetic strength={0.18}>
                  <Link
                    href="/signup"
                    className="inline-flex items-center rounded-[14px] border border-white/10 bg-white/5 px-4 py-2 text-[16px] font-medium text-white motion-safe:transition-colors motion-safe:duration-150 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    Create a workspace
                  </Link>
                </Magnetic>
                <Magnetic strength={0.18}>
                  <Link
                    href="/#agents"
                    className="inline-flex items-center rounded-[14px] border border-white/10 bg-white/5 px-4 py-2 text-[16px] font-medium text-white motion-safe:transition-colors motion-safe:duration-150 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    Connect an agent
                  </Link>
                </Magnetic>
              </div>
            </div>
            <CodePanel />
          </div>
          <div className="mt-2 grid gap-4 lg:grid-cols-2">
            <DarkCard title="MCP" body="The tools an agent calls to make, edit, and check a carousel.">
              <ul className="mt-5 space-y-2 font-mono text-[13px] text-[#cfcfcf]">
                <li>create_carousel</li>
                <li>update_text</li>
                <li>validate</li>
                <li>export</li>
              </ul>
            </DarkCard>
            <DarkCard
              title="Editor"
              body="Every carousel has a link. That is where a person tightens the post."
            >
              <div className="mt-5 rounded-xl bg-black/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8d8d8d]">Slide 1 · Hook</p>
                <p className="mt-3 text-[20px] font-medium leading-6 tracking-[-0.03em]">
                  Your agent can write this line.
                </p>
                <p className="mt-2 text-sm text-[#9a9a9a]">You still get to cut it.</p>
              </div>
            </DarkCard>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-8">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 lg:grid-cols-2">
          <div className="max-w-md lg:justify-self-end lg:pr-8">
            <h2 className="text-[36px] font-light leading-tight tracking-[-0.03em] text-black sm:text-[44px]">
              Connect Swiper where you already work
            </h2>
            <p className="mt-4 text-[18px] font-light leading-7 text-ink-soft">
              Cursor, Claude, or ChatGPT. The web app is for the brand kit, the key, and the editor.
            </p>
            <Link href="/signup" className={`group mt-6 inline-flex items-center gap-1 text-[16px] font-medium ${linkClass}`}>
              Create a workspace
              <ArrowRight className="motion-safe:transition-transform motion-safe:duration-150 group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="rounded-[24px] border border-black/6 bg-white p-6 sm:p-10">
            <ChatMock />
          </div>
        </div>
      </section>

      <section className="px-4 pb-8 sm:px-8">
        <div className="mx-auto grid max-w-[1200px] items-center gap-8 overflow-hidden rounded-[24px] border border-black/8 bg-white px-6 py-8 sm:px-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h2 className="max-w-md text-[32px] font-light leading-tight tracking-[-0.03em] text-black sm:text-[40px]">
              One kit for every agent on the team.
            </h2>
            <p className="mt-4 max-w-md text-[16px] font-light leading-6 text-ink-soft">
              Set the voice once. The next carousel starts from the same brand, not a blank prompt.
            </p>
            <Link href="/signup" className={`group mt-5 inline-flex items-center gap-1 text-[16px] font-medium ${linkClass}`}>
              Set up brand
              <ArrowRight className="motion-safe:transition-transform motion-safe:duration-150 group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="flex min-h-36 items-center justify-center overflow-visible py-2">
            <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 sm:gap-x-12">
              <li className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/cursor.png"
                  alt="Cursor"
                  width={36}
                  height={40}
                  className="h-9 w-auto opacity-80 motion-safe:transition-opacity motion-safe:duration-200 hover:opacity-100"
                />
              </li>
              <li className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/claude.png"
                  alt="Claude"
                  width={149}
                  height={32}
                  className="h-8 w-auto opacity-80 motion-safe:transition-opacity motion-safe:duration-200 hover:opacity-100"
                />
              </li>
              <li className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/openai.svg?v=2"
                  alt="OpenAI"
                  width={119}
                  height={32}
                  className="h-8 w-auto opacity-80 motion-safe:transition-opacity motion-safe:duration-200 hover:opacity-100"
                />
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section id="export" className="scroll-mt-24 px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="text-[32px] font-light tracking-[-0.03em] text-black sm:text-[40px]">
            Shapes a post can take
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stories.map((story) => (
              <SpotlightCard
                key={story.title}
                className="flex min-h-[380px] flex-col rounded-2xl border border-black/6 bg-white"
              >
                <article className="flex h-full min-h-[380px] flex-col p-5">
                  <p className="font-mono text-[22px] tracking-[-0.04em] text-black">{story.mark}</p>
                  <h3 className="mt-8 text-[18px] font-medium leading-6 tracking-[-0.02em]">{story.title}</h3>
                  <p className="mt-3 text-[15px] font-light leading-6 text-ink-soft">{story.body}</p>
                  <p className="mt-auto inline-flex w-fit rounded-md border border-black/8 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                    {story.meta}
                  </p>
                </article>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-8 sm:px-8">
        <div className="mx-auto max-w-[1200px]">
          <FormatRail items={formats} />
        </div>
      </section>

      <section className="relative px-4 py-16 sm:px-8">
        <div className="relative mx-auto flex max-w-[1200px] flex-col items-center rounded-[28px] bg-white px-6 py-20 text-center">
          <div className="flex h-[72px] w-[248px] items-center justify-center gap-2 rounded-2xl bg-nav shadow-md">
            <MiniIcon className="bg-[#7eb6e0]" />
            <MiniIcon className="bg-white" />
            <MiniIcon className="bg-green" />
            <MiniIcon className="bg-pink" label="01" />
          </div>
          <h2 className="mt-8 text-[40px] font-light tracking-[-0.03em] text-black sm:text-[56px]">
            Make the next carousel
          </h2>
          <p className="mt-4 max-w-xl text-[18px] font-light leading-7 text-ink-soft sm:text-[20px]">
            Create a workspace. Connect an agent. Ask for the post.
          </p>
          <Magnetic className="mt-8">
            <Link href="/signup" className={ctaClass}>
              Start for free
              <ArrowRight />
            </Link>
          </Magnetic>
          <p className="mt-4 text-[13px] font-light text-ink-soft">Free to start • No card required</p>
        </div>
      </section>
    </div>
  );
}

function Word({
  children,
  color,
  icon,
}: {
  children: string;
  color: string;
  icon: "agent" | "format" | "slides" | "export";
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${color}`}>
      <Glyph kind={icon} />
      {children}
    </span>
  );
}

function Glyph({ kind }: { kind: "agent" | "format" | "slides" | "export" }) {
  const tone =
    kind === "agent"
      ? "bg-[#d7ecf8] text-blue"
      : kind === "format"
        ? "bg-[#f8d4e4] text-pink"
        : kind === "slides"
          ? "bg-[#d7f3e4] text-green"
          : "bg-[#ffd9cf] text-accent";
  return (
    <span className={`inline-flex size-9 items-center justify-center rounded-lg ${tone}`} aria-hidden>
      {kind === "agent" ? "⌘" : kind === "format" ? "≡" : kind === "slides" ? "▢" : "↗"}
    </span>
  );
}

function FeaturePoint({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-[20px] font-medium tracking-[-0.02em] text-black">{title}</h3>
      <p className="mt-2 max-w-sm text-[16px] font-light leading-[23px] text-ink-faint">{body}</p>
    </div>
  );
}

function FeatureCard({
  id,
  eyebrow,
  eyebrowClass,
  title,
  body,
  href,
  children,
  wide,
}: {
  id?: string;
  eyebrow: string;
  eyebrowClass: string;
  title: string;
  body: string;
  href: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <SpotlightCard className="scroll-mt-24 rounded-[24px] border border-black/6 bg-white">
      <article id={id} className="p-6 sm:p-8">
        <div className={wide ? "grid items-start gap-8 lg:grid-cols-[0.8fr_1.2fr]" : ""}>
        <div>
          <div className="flex items-start justify-between gap-4">
            <span
              className={`inline-flex rounded px-1.5 py-0.5 text-[12px] font-light uppercase tracking-[0.08em] shadow-[inset_0_1px_0_rgba(0,0,0,0.08)] ${eyebrowClass}`}
            >
              {eyebrow}
            </span>
            <Link
              href={href}
              aria-label={title}
              className="inline-flex size-9 items-center justify-center rounded-full text-black/70 motion-safe:transition-colors motion-safe:duration-150 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowRight className="-rotate-45" />
            </Link>
          </div>
          <h3 className="mt-4 max-w-xl text-[22px] font-medium leading-7 tracking-[-0.02em] text-black">
            {title}
          </h3>
          <p className="mt-2 max-w-xl text-[16px] font-light leading-6 text-ink-faint">{body}</p>
        </div>
        <div className={wide ? "lg:mt-0" : "mt-6"}>{children}</div>
      </div>
    </article>
    </SpotlightCard>
  );
}

function HeroStage() {
  return (
    <div className="relative mx-auto mt-14 h-[390px] max-w-[1040px] sm:h-[500px]">
      <div className="absolute left-[9%] right-[9%] top-0 flex h-12 items-center gap-2 rounded-t-2xl border border-black/8 bg-[#f7f7f6] px-4 text-[12px] text-ink-soft">
        <span className="rounded-md bg-[#d7f3e4] px-2 py-0.5 text-[11px] text-green">Brand</span>
        sharp, specific, no hype
      </div>
      <div className="absolute left-[4.5%] right-[4.5%] top-8 flex h-14 items-center justify-between rounded-t-2xl border border-black/8 bg-white px-4 shadow-sm">
        <div className="min-w-0">
          <p className="text-[11px] text-ink-faint">Format</p>
          <p className="truncate text-[14px] font-medium tracking-[-0.02em]">Problem → Insight → Product</p>
        </div>
        <span className="ml-3 shrink-0 rounded-full bg-black px-3 py-1 text-[12px] font-medium text-white">
          6 slides
        </span>
      </div>
      <div className="absolute inset-x-0 top-[5.25rem] overflow-hidden rounded-t-[20px] border border-black/8 bg-white shadow-[0_24px_60px_-28px_rgba(0,0,0,0.4)]">
        <div className="grid grid-cols-[148px_1fr] sm:grid-cols-[180px_1fr]">
          <div className="border-r border-black/6 bg-[#f7f7f6] p-3">
            <p className="px-2 text-[11px] uppercase tracking-[0.12em] text-ink-faint">Slides</p>
            {["Hook", "Problem", "Insight", "Proof", "Product", "CTA"].map((role, index) => (
              <div
                key={role}
                className={`mt-1 rounded-lg px-2 py-2 text-[13px] ${index === 0 ? "bg-white font-medium shadow-sm" : "text-ink-soft"}`}
              >
                {index + 1}. {role}
              </div>
            ))}
          </div>
          <div className="flex justify-center bg-[#f3f3f1] p-6">
            <div className="w-full max-w-[280px] rounded-xl bg-[#111111] p-5 text-white">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/50">Hook</p>
              <p className="mt-4 text-[22px] font-medium leading-6 tracking-[-0.03em]">
                Chat can write the caption. It still cannot ship the carousel.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditorMock() {
  return (
    <div className="grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-2xl border border-black/8 bg-[#fafafa] p-4">
        <p className="text-[13px] font-medium">
          Inbox <span className="text-accent">6</span>
        </p>
        {["Hook is too long", "Proof needs a number", "CTA is vague"].map((item) => (
          <div key={item} className="mt-3 border-t border-black/6 pt-3 text-[13px] text-ink-soft">
            {item}
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-black/8 bg-white p-4 shadow-sm">
        <p className="text-[13px] font-medium">Slide 1 · Hook</p>
        <p className="mt-3 text-[15px] leading-6 text-black">
          Make the first line shorter. Keep the product out of it.
        </p>
        <p className="mt-4 text-[12px] text-ink-faint">Saved · waiting on the next agent pass</p>
      </div>
    </div>
  );
}

function FormatMock() {
  return (
    <div className="rounded-2xl border border-black/8 bg-[#fafafa] p-4">
      <p className="text-[22px] font-medium tracking-[-0.03em]">Myth → Reality</p>
      <p className="mt-3 text-[14px] leading-6 text-ink-soft">
        Name the myth. Replace it with the mechanic. Then show the product as the consequence.
      </p>
      <div className="mt-4 flex gap-2">
        {["Myth", "Reality", "Product"].map((chip) => (
          <span key={chip} className="rounded-full bg-white px-3 py-1 text-[12px] shadow-sm">
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}

function BrandMock() {
  const rows = [
    ["Tone", "sharp, specific"],
    ["Audience", "founders who post"],
    ["Avoid", "unlock, seamless, revolutionize"],
  ];
  return (
    <div className="rounded-2xl border border-black/8 bg-white p-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between rounded-xl px-3 py-3 odd:bg-[#f7f7f6]">
          <span className="text-[12px] uppercase tracking-[0.12em] text-ink-faint">{label}</span>
          <span className="text-[14px] font-medium">{value}</span>
        </div>
      ))}
    </div>
  );
}

function AgentMock() {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_0.8fr]">
      <pre className="overflow-x-auto rounded-2xl bg-[#1c1c1c] p-4 text-[12px] leading-6 text-[#d7d7d7]">
        <code>{`{
  "mcpServers": {
    "swiper": {
      "command": "pnpm",
      "args": ["--filter", "@swiper/mcp", "start"]
    }
  }
}`}</code>
      </pre>
      <div className="rounded-2xl border border-black/8 bg-[#fafafa] p-4">
        <p className="text-[12px] text-ink-faint">You</p>
        <p className="mt-1 text-[14px] leading-6">Make a carousel explaining why we are different.</p>
        <p className="mt-4 text-[12px] text-accent">Swiper</p>
        <p className="mt-1 text-[14px] leading-6">6 slides. Editor link is ready.</p>
      </div>
    </div>
  );
}

function CodePanel() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#2a2a2a] p-5 font-mono text-[12px] leading-6 text-[#d5d5d5] sm:text-[13px]">
      <p>
        <span className="text-[#8d8d8d]">{"// slide_hook"}</span>
      </p>
      <p>
        <span className="text-accent">const</span> op = {"{"}
      </p>
      <p className="pl-4">
        op: <span className="text-[#8fd0a4]">&quot;update_text&quot;</span>,
      </p>
      <p className="pl-4">
        slideId: <span className="text-[#8fd0a4]">&quot;slide_hook&quot;</span>,
      </p>
      <p className="pl-4">
        text: <span className="text-[#8fd0a4]">&quot;Cut the first line in half.&quot;</span>
      </p>
      <p>{"}"}</p>
      <p className="mt-4 text-[#8d8d8d]">{"// same document in the editor and the export"}</p>
    </div>
  );
}

function DarkCard({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 motion-safe:transition-colors motion-safe:duration-150 hover:bg-white/[0.08]">
      <div className="flex items-start justify-between">
        <h3 className="text-[20px] font-medium">{title}</h3>
        <ArrowRight className="-rotate-45 text-white/70" />
      </div>
      <p className="mt-2 max-w-sm text-[15px] font-light leading-6 text-[#bdbdbd]">{body}</p>
      {children}
    </div>
  );
}

function ChatMock() {
  const messages = [
    { who: "You", text: "Make a carousel for the launch. Keep the product off slide one." },
    { who: "Agent", text: "Using Problem → Insight. Six slides. Hook is a status quo, not a slogan." },
    { who: "You", text: "Make slide 1 shorter." },
    { who: "Agent", text: "Updated. Editor link is in the workspace." },
  ];
  return (
    <div className="mx-auto max-w-sm overflow-hidden rounded-[28px] border border-black/10 bg-[#fafafa] shadow-sm">
      <div className="flex items-center justify-between border-b border-black/6 px-4 py-3">
        <p className="text-[13px] font-medium">
          Thread <span className="text-accent">4</span>
        </p>
        <p className="text-[12px] text-ink-faint">Cursor</p>
      </div>
      <div className="space-y-4 p-4">
        {messages.map((message) => (
          <div key={message.text}>
            <p className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">{message.who}</p>
            <p className="mt-1 text-[14px] leading-5">{message.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniIcon({ className, label }: { className: string; label?: string }) {
  return (
    <span
      className={`inline-flex size-11 items-center justify-center rounded-xl text-[12px] font-medium text-black ${className}`}
    >
      {label ?? ""}
    </span>
  );
}

const stories = [
  {
    mark: "01",
    title: "Open with the pain, not the product",
    body: "The first slide earns the swipe. The product shows up after the insight.",
    meta: "Problem → Insight",
  },
  {
    mark: "02",
    title: "Five specific things, then one ask",
    body: "A numbered list with a point of view. The last slide is the only pitch.",
    meta: "5 things",
  },
  {
    mark: "03",
    title: "Show the old workflow next to the new one",
    body: "Before is the mess of tabs. After is one document the agent can edit.",
    meta: "Before → After",
  },
  {
    mark: "04",
    title: "Kill the myth, then name the mechanic",
    body: "“AI made me a carousel” is the myth. A typed slide document is the reality.",
    meta: "Myth → Reality",
  },
];
