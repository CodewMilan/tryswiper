import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { AGENT_CLIENTS } from "@/lib/agent-clients";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SupportContact } from "@/components/support-contact";

export const metadata = { title: "Support — Swiper", description: "Get help with your Swiper workspace, agents, carousels and billing." };
export default async function SupportPage() {
  const session = await getSessionUser();
  return <div className="min-h-screen bg-background"><SiteNav initialMode={session ? "member" : "guest"} /><main id="main-content" className="mx-auto max-w-[1000px] px-6 pb-20 pt-32 sm:px-10">
    <h1 className="text-4xl font-light tracking-tight sm:text-5xl">How can we help?</h1><p className="mt-5 max-w-xl text-base leading-7 text-ink-soft">Get help with setup, a carousel, your account or a billing question.</p>
    <section className="mt-10 rounded-[24px] border border-border bg-card p-6 sm:p-8"><h2 className="text-xl font-medium">Contact Swiper</h2><SupportContact /><p className="mt-5 max-w-xl text-sm leading-7 text-ink-soft">Tell us what you were trying to do, what happened and which client or browser you used. For billing, include your account email or order reference. Keep private API keys, full connector URLs, passwords and card details out of your message.</p><p className="mt-3 text-sm text-ink-soft">Operated by MILAN SAMPATH.</p></section>
    <section className="mt-10"><h2 className="text-2xl font-medium">Find an answer</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">{[{href:"/guide",title:"How to use Swiper",body:"Create, review, edit and export your first carousel."},{href:"/pricing",title:"Plans and billing",body:"Compare allowances and manage an existing subscription."},...Object.entries(AGENT_CLIENTS).map(([id, client])=>({href:`/guide/${id}`,title:`Connect ${client.title}`,body:"Setup, key privacy and connection troubleshooting."})),{href:"/formats",title:"Reusable formats",body:"Find a format or manage designs saved in your workspace."}].map(item=><Link key={item.href} href={item.href} className="rounded-2xl border border-border p-5 focus-visible:ring-2 focus-visible:ring-ring"><h3 className="font-medium">{item.title}</h3><p className="mt-2 text-sm leading-6 text-ink-soft">{item.body}</p></Link>)}</div></section>
  </main><SiteFooter signedIn={!!session} /></div>;
}
