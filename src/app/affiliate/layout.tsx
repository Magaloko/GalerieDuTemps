import { auth } from "@/lib/auth/config";
import { affiliateById } from "@/lib/db/affiliates";
import { AffiliateSidebar } from "@/components/affiliate/affiliate-sidebar";
import { AuthSessionProvider } from "@/components/layout/session-provider";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Партнёрский кабинет", template: "%s | Партнёр — Galerie du Temps" },
};

/**
 * Affiliate-Layout: greift nur, wenn eingeloggter Affiliate.
 * Public-Seiten (anmelden, registrieren, programm) bringen ihren eigenen
 * Header/Footer mit und werden hier ohne Wrapper durchgereicht.
 *
 * Der Proxy (src/proxy.ts) sorgt dafür, dass nicht-angemeldete User auf
 * geschützten Pfaden zur Anmeldung umgeleitet werden, bevor dieser Layout
 * überhaupt rendert.
 */
export default async function AffiliateLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Kein Session oder kein Affiliate → Public-Seite, ohne Wrapper rendern
  if (!session || session.user?.role !== "affiliate") {
    return <>{children}</>;
  }

  // Eingeloggter Affiliate → Sidebar-Layout
  const affiliate = await affiliateById(session.user.id).catch(() => null);

  return (
    <AuthSessionProvider session={session}>
      <div className="min-h-screen bg-vintage-brown/40">
        <AffiliateSidebar
          userName={`${affiliate?.vorname ?? ""} ${affiliate?.nachname ?? ""}`.trim() || session.user.name}
          userEmail={session.user.email}
          referralCode={affiliate?.referral_code}
        />
        <div className="ml-64 flex flex-col min-h-screen">
          <header className="sticky top-0 z-30 bg-vintage-brown/40/95 backdrop-blur border-b border-vintage-sand/40 px-8 py-4">
            <div className="flex items-center justify-between">
              <div />
              <div className="text-xs text-vintage-dust font-sans tracking-wider">
                {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </div>
            </div>
          </header>
          <main className="flex-1 px-8 py-8">{children}</main>
        </div>
      </div>
    </AuthSessionProvider>
  );
}
