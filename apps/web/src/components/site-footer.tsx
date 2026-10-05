import Link from "next/link";
import { Mark } from "@/components/mark";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/#editor", label: "Editor" },
      { href: "/#formats", label: "Formats" },
      { href: "/#brand", label: "Brand kit" },
      { href: "/#export", label: "Export" },
      { href: "/#product", label: "How it works" },
    ],
  },
  {
    title: "Workspace",
    links: [
      { href: "/signup", label: "Create account" },
      { href: "/login", label: "Sign in" },
      { href: "/brand", label: "Brand kit" },
      { href: "/connect", label: "Connect an agent" },
    ],
  },
  {
    title: "Agents",
    links: [
      { href: "/#agents", label: "Cursor" },
      { href: "/#agents", label: "Claude" },
      { href: "/#agents", label: "ChatGPT" },
      { href: "/#agents", label: "MCP config" },
    ],
  },
  {
    title: "Formats",
    links: [
      { href: "/#formats", label: "Problem → Insight" },
      { href: "/#formats", label: "5 things" },
      { href: "/#formats", label: "Before → After" },
      { href: "/#formats", label: "Myth → Reality" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/#document", label: "Typed document" },
      { href: "/#editor", label: "Review a slide" },
      { href: "/#export", label: "Export" },
      { href: "/signup", label: "Start for free" },
    ],
  },
];

export function SiteFooter() {
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
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          {columns.map((column) => (
            <div key={column.title}>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-black">
                {column.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
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
