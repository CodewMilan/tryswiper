import Link from "next/link";
import { notFound } from "next/navigation";
import { AGENT_CLIENTS, FIRST_PROMPT, type AgentClient } from "@/lib/agent-clients";
import { getSessionUser } from "@/lib/session";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

function lookup(client: string) {
  if (!Object.hasOwn(AGENT_CLIENTS, client)) notFound();
  return AGENT_CLIENTS[client as AgentClient];
}
export async function generateMetadata({ params }: { params: Promise<{ client: string }> }) {
  const { client } = await params;
  return { title: `Connect ${lookup(client).title} to Swiper` };
}
export default async function ClientGuide({ params }: { params: Promise<{ client: string }> }) {
  const { client } = await params;
  const guide = lookup(client);
  const session = await getSessionUser();
  const destination = `/connect?client=${client}`;
  const href = session ? destination : `/signup?next=${encodeURIComponent(destination)}`;
  return <div className="min-h-screen bg-background">
    <SiteNav initialMode={session ? "member" : "guest"} />
    <main id="main-content" className="mx-auto max-w-[1000px] px-6 pb-20 pt-32 sm:px-10">
      <Link href="/guide" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">How to use Swiper</Link>
      <h1 className="mt-4 text-4xl font-light tracking-tight sm:text-5xl">Connect {guide.title} to Swiper.</h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-ink-soft">Create and revise carousels from your conversation, then review and export them in Swiper.</p>
      <nav aria-label="Agent setup guides" className="mt-6 flex flex-wrap gap-2">{Object.entries(AGENT_CLIENTS).map(([id, item]) => <Link key={id} href={`/guide/${id}`} aria-current={id === client ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-xl border px-4 text-sm focus-visible:ring-2 focus-visible:ring-ring ${id === client ? "border-black bg-black text-white" : "border-border bg-card"}`}>{item.title}</Link>)}</nav>
      <section className="mt-10 rounded-[24px] border border-border bg-card p-6 sm:p-8"><h2 className="text-xl font-medium">Before you start</h2><p className="mt-3 leading-7 text-ink-soft">{guide.requirement}</p><p className="mt-3 leading-7 text-ink-soft">You’ll also need a Swiper workspace. Add your product name, description and audience in your brand kit for a more useful draft.</p><Link href={session ? "/brand" : "/signup?next=%2Fbrand"} className="mt-3 inline-flex min-h-11 items-center text-sm underline underline-offset-4">Set up your brand kit</Link></section>
      <section className="mt-10"><h2 className="text-2xl font-medium">Set it up</h2><ol className="mt-5 space-y-5">{guide.steps.map((step, index) => <li key={step} className="flex gap-4"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary font-mono text-sm">{index + 1}</span><p className="pt-0.5 leading-7">{step}</p></li>)}</ol><Link href={href} className="mt-7 inline-flex min-h-11 items-center rounded-xl bg-black px-5 py-3 text-sm font-medium text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Set up {guide.title}</Link></section>
      <section className="mt-10 rounded-[24px] border border-border p-6 sm:p-8"><h2 className="text-xl font-medium">Your first prompt</h2><p className="mt-4 rounded-xl bg-card p-5 text-sm leading-7">{FIRST_PROMPT}</p><p className="mt-4 leading-7 text-ink-soft">After the first successful request, use Check connection in Swiper. Key activity confirms a request reached your workspace. Ask for a draft and open its editor link to verify the full workflow. Review every slide and check claims before exporting.</p></section>
      <section className="mt-10"><h2 className="text-2xl font-medium">If it doesn’t connect</h2><p className="mt-4 leading-7 text-ink-soft">{guide.troubleshooting}</p><p className="mt-4 leading-7 text-ink-soft">A private key gives access to your workspace. Keep it out of shared messages and screenshots{client === "chatgpt" ? "; the ChatGPT URL contains that key" : ""}. Revoke it from Connect to stop access, then update your client with a new key.</p><div className="mt-4 flex flex-wrap gap-x-6"><a href={guide.docs} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Official {guide.title} instructions</a><Link href="/support" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Get help</Link></div></section>
    </main>
    <SiteFooter signedIn={!!session} />
  </div>;
}
