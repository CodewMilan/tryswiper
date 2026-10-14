import Link from "next/link";
import { ArrowRight, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getSessionUser } from "@/lib/session";

export const metadata = { title: "How to use Swiper", description: "Set up your brand, connect an agent, create a carousel, review every slide, and export your post." };

const steps = [
  { title: "Set up your brand", href: "/brand", action: "Open brand kit", body: "Add your product name, what it does, and who it’s for. Choose colors and fonts in the live preview, and upload a logo if you have one. Save your brand kit before continuing.", detail: "Only a product name is required. Defaults let you start immediately. Open more voice and writing settings for tone, proof points, and words to avoid. Saved changes apply to new carousels." },
  { title: "Connect the agent you use", href: "/connect", action: "Connect an agent", body: "Create a private key and save it somewhere safe. Choose Cursor, Claude, or ChatGPT and follow that client’s setup instructions. Copy the first prompt and paste it into a new conversation.", detail: "Your key is shown once. Check connection after the agent’s first request. A key that has never been used means the connection still needs to be tested. Hosted clients need a public HTTPS Swiper address." },
  { title: "Describe your post", href: "/new", action: "Try in the browser", body: "Tell your agent the topic, audience, and one takeaway. Ask it to read your brand kit, choose a story format, run quality checks, and return an editor link. You can ask it to shorten a slide or change the call to action.", detail: "You can also generate from a brief in the browser. Choose a story shape and generate your carousel, or select Start by hand for a blank or saved format. Creating a draft uses a carousel slot; generating copy also uses an AI generation." },
  { title: "Review and edit every slide", href: "/library", action: "Open your library", body: "Open the editor link or find the draft in your library. Select a slide, then select text or an image on the canvas. Edit its content and design in the properties panel. Reorder, add, duplicate, or remove slides as needed.", detail: "Changes save automatically. Wait for All changes saved. Undo reverses a saved edit. If a save fails, keep the tab open and retry. For a conflict, download the complete local draft before loading the latest version. Restore your JSON through More carousel options → Restore local backup; the saved version remains available through Undo." },
  { title: "Export and share", href: "/pricing", action: "See plans and allowances", body: "Choose Export. Read the hook, verify claims, and check the closing call to action. Use Check carousel to find copy and layout issues, then choose PNG images or a PDF document. Pro also includes JPG images.", detail: "Unzip images and upload slides in numbered order. Upload the PDF as a document post on LinkedIn. You decide what to post and when. Swiper does not post to your social accounts." },
];

export default async function GuidePage() {
  const session = await getSessionUser();
  const href = (path: string) => session ? path : `/signup?next=${encodeURIComponent(path)}`;
  return <div className="min-h-full bg-background">
    <SiteNav initialMode={session ? "member" : "guest"} />
    <main id="main-content" className="mx-auto max-w-[1100px] px-6 pb-20 pt-32">
      <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">The Swiper workflow</p>
      <h1 className="mt-4 max-w-2xl text-4xl font-light leading-tight tracking-[-0.035em] sm:text-5xl">From an idea to a post you’re ready to share.</h1>
      <p className="mt-5 max-w-xl text-base leading-7 text-ink-soft">Your agent creates the draft. Swiper gives you a place to review it, make it yours, and download the finished carousel.</p>
      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <ol className="space-y-4">{steps.map((step, index) => <li key={step.title} className="rounded-[24px] border border-border bg-card p-6 sm:p-8">
          <div className="flex items-start gap-4"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary font-mono text-sm">{index + 1}</span><h2 className="pt-1 text-xl font-medium tracking-tight">{step.title}</h2></div>
          <p className="mt-4 text-sm leading-7">{step.body}</p><p className="mt-3 text-sm leading-6 text-ink-soft">{step.detail}</p>
          <Link href={step.href === "/pricing" ? "/pricing" : href(step.href)} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{step.action}<ArrowRight size={16} /></Link>
        </li>)}</ol>
        <aside className="space-y-5 lg:sticky lg:top-24">
          <section className="rounded-[24px] border border-border bg-card p-6"><CheckCircle size={28} className="text-ink-soft" /><h2 className="mt-4 text-lg font-medium tracking-tight">Your first successful session</h2><p className="mt-3 text-sm leading-6 text-ink-soft">One saved brand kit, one editable carousel, and one downloaded file you’ve reviewed.</p><Link href={href("/brand")} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground">{session ? "Set up your brand" : "Start for free"}</Link></section>
          <section className="p-2"><h2 className="text-sm font-medium">Come back to a good format</h2><p className="mt-2 text-sm leading-6 text-ink-soft">In the editor, open More carousel options and choose Save as format. It appears under your workspace formats in Start by hand. Each use makes an independent draft with its saved design, copy, and images.</p></section>
          <section className="p-2"><h2 className="text-sm font-medium">When you hit a limit</h2><p className="mt-2 text-sm leading-6 text-ink-soft">Allowances reset monthly on the first day (UTC). If you run out of AI generations, start by hand. Deleting a carousel made this month frees its slot; generation and export usage remain counted.</p></section>
        </aside>
      </div>
    </main>
    <SiteFooter signedIn={!!session} />
  </div>;
}
