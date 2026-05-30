import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminBell }    from "@/components/layout/admin-bell";
import { ViewSwitch }   from "@/components/layout/view-switch";
import { AuthSessionProvider } from "@/components/layout/session-provider";
import { ungeleseneCount }    from "@/lib/notifications/lead-notify";
import { adminBadgeCounts }   from "@/lib/db/dashboard-v2";
import { getAdminView }       from "@/lib/admin-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Админ",
    template: "%s | Админ · Galerie du Temps",
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-seitige Auth + Rollen-Prüfung (zusätzlich zur Middleware).
  // Nur admin/superadmin/affiliate dürfen ins Admin-Backend; alle anderen
  // (customer, unauthentifiziert) werden zum Login geschickt.
  const session = await auth();
  if (!session) redirect("/login");
  const rolle = session.user?.role;
  if (rolle !== "admin" && rolle !== "superadmin") {
    if (rolle === "customer")  redirect("/kunde");
    if (rolle === "affiliate") redirect("/affiliate");
    redirect("/login");
  }

  // Live-Badges für Sidebar (alle 6 Counts parallel, 30s gecached)
  const [inboxCount, badges, adminView] = await Promise.all([
    ungeleseneCount().catch(() => 0),
    adminBadgeCounts().catch(() => undefined),
    getAdminView().catch(() => "classic" as const),
  ]);

  return (
    <AuthSessionProvider session={session}>
      <div className="min-h-screen" style={{ background: "var(--color-paper)" }}>
        {/* Sidebar */}
        <AdminSidebar
          userName={session.user?.name}
          userEmail={session.user?.email}
          inboxCount={inboxCount}
          badges={badges}
        />

        {/* Hauptinhalt – Sidebar-Offset nur ab md (auf Mobile ist Sidebar ein Drawer) */}
        <div className="md:ml-64 flex flex-col min-h-screen">
          {/* Top Bar */}
          <header
            className="sticky top-0 z-20 backdrop-blur px-4 md:px-8 py-4"
            style={{
              background:  "rgba(245, 241, 234, 0.95)",  /* paper/95 */
              borderBottom: "1px solid var(--color-line)",
            }}
          >
            <div className="flex items-center justify-between gap-3 pl-12 md:pl-0">
              <div className="flex items-center gap-3 min-w-0">
                {/* Rückweg zur App: nur wenn die gespeicherte Ansicht = App ist.
                    Diese Admin-Seite wurde dann aus einem App-Tab geöffnet —
                    ohne diesen Link gäbe es keinen sichtbaren Weg zurück. */}
                {adminView === "app" && (
                  <Link
                    href="/app"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 whitespace-nowrap transition-colors hover:opacity-80"
                    style={{
                      background:    "var(--color-coral)",
                      color:         "#fff",
                      fontSize:      10,
                      fontWeight:    500,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      borderRadius:  6,
                      touchAction:   "manipulation",
                    }}
                    aria-label="Вернуться в приложение"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">В приложение</span>
                  </Link>
                )}
                <div id="admin-page-title" className="min-w-0 truncate" />
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <AdminBell />
                {/* App ↔ Klassik-Umschalter nur für echte Klassik-Nutzer.
                    Im App-Modus übernimmt der „В приложение"-Link links den
                    Rückweg — ein zweiter App-Button wäre redundant. */}
                {adminView === "classic" && <ViewSwitch current="classic" />}
                <div
                  className="hidden sm:block text-[11px] uppercase font-medium"
                  style={{ letterSpacing: "0.18em", color: "var(--color-ink-mute)" }}
                >
                  {new Date().toLocaleDateString("ru-RU", {
                    weekday: "long",
                    day:     "numeric",
                    month:   "long",
                    year:    "numeric",
                  })}
                </div>
              </div>
            </div>
          </header>

          {/* Seiteninhalt */}
          <main className="flex-1 px-4 md:px-8 py-6 md:py-8" style={{ color: "var(--color-ink)" }}>
            {children}
          </main>
        </div>
      </div>
    </AuthSessionProvider>
  );
}
