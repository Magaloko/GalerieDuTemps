import { auth } from "@/lib/auth/config";
import { customerById } from "@/lib/db/customers";
import { KundeSidebar } from "@/components/kunde/kunde-sidebar";
import { AuthSessionProvider } from "@/components/layout/session-provider";
import { getDictionary } from "@/i18n";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Мой кабинет", template: "%s | Мой кабинет — Galerie du Temps" },
};

export default async function KundeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // Wenn nicht customer-Session → öffentliche Routen durchreichen (registrieren/anmelden/etc.)
  if (!session || session.user?.role !== "customer") {
    return <>{children}</>;
  }

  const [customer, { locale }] = await Promise.all([
    customerById(session.user.id).catch(() => null),
    getDictionary(),
  ]);

  // Locale → BCP-47 für Datum (kz fällt auf ru zurück, weil kk-KZ inkonsistent ist)
  const bcp47 = locale === "kz" ? "ru-RU" : locale === "en" ? "en-US" : "ru-RU";

  return (
    <AuthSessionProvider session={session}>
      <div className="min-h-screen bg-vintage-parchment">
        <KundeSidebar
          vorname={customer?.vorname}
          email={session.user.email}
          customer_type={customer?.customer_type ?? "b2c"}
        />
        <div className="ml-64 flex flex-col min-h-screen">
          <header className="sticky top-0 z-30 bg-vintage-parchment/95 backdrop-blur border-b border-vintage-sand px-8 py-4">
            <div className="flex items-center justify-between">
              <div />
              <div className="text-xs text-vintage-dust font-sans tracking-wider">
                {new Date().toLocaleDateString(bcp47, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </div>
            </div>
          </header>
          <main className="flex-1 px-8 py-8">{children}</main>
        </div>
      </div>
    </AuthSessionProvider>
  );
}
