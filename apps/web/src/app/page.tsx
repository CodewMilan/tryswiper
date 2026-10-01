import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <p className="font-semibold tracking-tight">Swiper</p>
        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="inline-flex min-h-10 items-center rounded-md px-3 text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Get started
          </Link>
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
        <p className="text-sm font-medium text-accent">Agent-first carousels</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Describe the post. Your agent builds the carousel.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          Connect Swiper in Cursor, Claude, or ChatGPT. The agent reads your brand,
          picks a format, writes slides, and hands you an editor link.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Create a workspace
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-md border border-border px-5 text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            I already have an account
          </Link>
        </div>
        <ol className="mt-16 grid gap-4 text-sm sm:grid-cols-3">
          <li className="rounded-xl border border-border bg-card p-4">
            <p className="font-medium">1. Connect MCP</p>
            <p className="mt-2 text-muted-foreground">
              Mint a key and drop it into Cursor or Claude.
            </p>
          </li>
          <li className="rounded-xl border border-border bg-card p-4">
            <p className="font-medium">2. Ask for a carousel</p>
            <p className="mt-2 text-muted-foreground">
              “Make a carousel explaining why we’re different.”
            </p>
          </li>
          <li className="rounded-xl border border-border bg-card p-4">
            <p className="font-medium">3. Iterate</p>
            <p className="mt-2 text-muted-foreground">
              “Make slide 1 shorter.” Then open the editor link.
            </p>
          </li>
        </ol>
      </main>
    </div>
  );
}
