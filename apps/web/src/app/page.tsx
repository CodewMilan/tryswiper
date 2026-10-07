import { Landing } from "@/components/landing";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSessionUser();
  return (
    <div className="min-h-full bg-background">
      <SiteNav initialMode={session ? "member" : "guest"} />
      <main>
        <Landing signedIn={Boolean(session)} />
      </main>
      <SiteFooter signedIn={Boolean(session)} />
    </div>
  );
}
