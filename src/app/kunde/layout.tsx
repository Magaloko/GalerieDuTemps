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
  // Wenn nicht customer-Session → öffentliche Routen durchreichen
  // (anmelden, registrieren, passwort-vergessen, etc.)
  if (!session || session.user?.role !== "customer") {
    return <>{children}</>;
  }

  const [customer, { locale }] = await Promise.all([
    customerById(session.user.id).catch(() => null),
    getDictionary(),
  ]);

  const bcp47 = locale === "kz" ? "ru-RU" : locale === "en" ? "en-US" : "ru-RU";

  return (
    <AuthSessionProvider session={session}>
      <div
        className="min-h-screen"
        style={{ background: "var(--color-paper)", color: "var(--color-ink)" }}
      >
        <KundeSidebar
          vorname={customer?.vorname}
          email={session.user.email}
          customer_type={customer?.customer_type ?? "b2c"}
        />

        {/* Mobile: kein Sidebar-Offset (sie ist Drawer); Desktop: ml-64 */}
        <div className="md:ml-64 flex flex-col min-h-screen">

          {/* ─── Top-Bar ──────────────────────────────────────── */}
          <header
            className="sticky top-0 z-30 px-4 md:px-8 py-4"
            style={{
              background:    "rgba(245, 241, 234, 0.92)",
              borderBottom:  "1px solid var(--color-line)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="flex items-center justify-between pl-12 md:pl-0">
              <div id="kunde-page-title" />
              <div
                className="hidden sm:block text-[11px] uppercase font-medium"
                style={{ letterSpacing: "0.18em", color: "var(--color-ink-mute)" }}
              >
                {new Date().toLocaleDateString(bcp47, {
                  weekday: "long",
                  day:     "numeric",
                  month:   "long",
                  year:    "numeric",
                })}
              </div>
            </div>
          </header>

          {/* ─── Page-Content ─────────────────────────────────── */}
          <main className="flex-1 px-4 md:px-8 py-6 md:py-10">
            {children}
          </main>
        </div>
      </div>
    </AuthSessionProvider>
  );
}
