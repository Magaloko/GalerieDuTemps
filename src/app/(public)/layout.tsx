import { SiteHeader }   from "@/components/layout/site-header";
import { SiteFooter }   from "@/components/layout/site-footer";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { ChatWidget }   from "@/components/ai/chat-widget";
import { CookieBanner } from "@/components/cookie-banner";
import { FeatureGate }  from "@/components/feature-gate";
import { LenisProvider } from "@/components/providers/lenis-provider";
import { getDictionary } from "@/i18n";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getDictionary();
  return (
    // LenisProvider (Smooth-Scroll + GSAP) NUR im Public-Bereich — nicht im
    // Root-Layout, damit Admin/Mini-App/Kunden-Bereich nicht ~110 KB JS laden.
    <LenisProvider>
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1 pb-24 md:pb-0">
          {children}
        </main>
        <SiteFooter />
        <MobileTabBar t={t} />
        {/* ChatWidget nur wenn KI-Assistent aktiv (Admin-Toggle) */}
        <FeatureGate feature="ki_assistent">
          <ChatWidget />
        </FeatureGate>
        <CookieBanner />
      </div>
    </LenisProvider>
  );
}
