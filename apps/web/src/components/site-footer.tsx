import Link from "next/link";
import { Mark } from "@/components/mark";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/guide", label: "How to use Swiper" },
      { href: "/library", label: "Editor" },
      { href: "/formats", label: "Formats" },
      { href: "/brand", label: "Brand kit" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Workspace",
    links: [
      { href: "/signup", label: "Create account" },
      { href: "/login", label: "Sign in" },
      { href: "/library", label: "Carousel library" },
      { href: "/new", label: "Start a carousel" },
      { href: "/connect", label: "Connect an agent" },
    ],
  },
  {
    title: "Agents",
    links: [
      { href: "/guide/cursor", label: "Cursor" },
      { href: "/guide/claude", label: "Claude" },
      { href: "/guide/chatgpt", label: "ChatGPT" },
      { href: "/connect", label: "MCP config" },
    ],
  },
];

export function SiteFooter({ signedIn }: { signedIn: boolean }) {
  return (
    <footer className="bg-background px-6 py-14 sm:px-10">
      <div className="mx-auto grid max-w-[1200px] gap-10 md:grid-cols-[220px_1fr]">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Mark />
            <span className="text-[22px] font-medium tracking-[-0.03em]">Swiper</span>
          </Link>
          <p className="mt-8 font-mono text-[13px] text-ink-soft">© 2026. All rights reserved.</p>
          <Link href="/support" className="mt-3 inline-flex min-h-11 items-center text-sm underline underline-offset-4">Contact support</Link>
          <p className="mt-2 text-xs text-ink-soft">Operated by MILAN SAMPATH.</p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title}>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-black">
                {column.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {column.links.filter((link) => !signedIn || (link.href !== "/signup" && link.href !== "/login")).map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[15px] font-light leading-6 text-black motion-safe:transition-colors motion-safe:duration-150 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
