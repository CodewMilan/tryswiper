import { Landing } from "@/components/landing";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export default function Home() {
  return (
    <div className="min-h-full bg-background">
      <SiteNav />
      <main>
        <Landing />
      </main>
      <SiteFooter />
    </div>
  );
}
