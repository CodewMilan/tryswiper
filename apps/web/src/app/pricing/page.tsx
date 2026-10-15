import { Suspense } from "react";
import { PricingPlans } from "@/components/pricing-plans";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { dodoConfig } from "@/lib/dodo";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pricing · Swiper",
};

export default async function PricingPage() {
  const session = await getSessionUser();
  return (
    <div className="min-h-full bg-background">
      <SiteNav initialMode={session ? "member" : "guest"} />
      <main id="main-content" className="hero-grid">
        <Suspense fallback={<div className="mx-auto min-h-[50vh] max-w-[1200px] px-6 py-16" />}>
          <PricingPlans checkoutAvailability={{ pro: dodoConfig(process.env, "pro").ready, studio: dodoConfig(process.env, "studio").ready }} initialSignedIn={Boolean(session)} />
        </Suspense>
      </main>
      <SiteFooter signedIn={Boolean(session)} />
    </div>
  );
}
