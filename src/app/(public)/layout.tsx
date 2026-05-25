import { SiteHeader }   from "@/components/layout/site-header";
import { SiteFooter }   from "@/components/layout/site-footer";
import { ChatWidget }   from "@/components/ai/chat-widget";
import { CookieBanner } from "@/components/cookie-banner";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
      <SiteFooter />
      <ChatWidget />
      <CookieBanner />
    </div>
  );
}
