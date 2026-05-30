import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminBell }    from "@/components/layout/admin-bell";
import { ViewSwitch }   from "@/components/layout/view-switch";
import { CommandMenu }  from "@/components/layout/command-menu";
import { OrderPeek }    from "@/components/layout/order-peek";
import { AuthSessionProvider } from "@/components/layout/session-provider";
import { ungeleseneCount }    from "@/lib/notifications/lead-notify";
import { adminBadgeCounts }   from "@/lib/db/dashboard-v2";
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

  // /admin ist seit der /app-Migration immer die Klassik-Ansicht (Sidebar).
  // App-Operatoren nutzen echte /app/*-Routen; der frühere Cookie-Embed
  // (AppShell um /admin-Seiten) ist dadurch obsolet und entfernt.
  // Live-Badges für Sidebar (alle 6 Counts parallel, 30s gecached)
  const [inboxCount, badges] = await Promise.all([
    ungeleseneCount().catch(() => 0),
    adminBadgeCounts().catch(() => undefined),
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
              <div id="admin-page-title" className="min-w-0 truncate" />
              <div className="flex items-center gap-3 flex-shrink-0">
                <CommandMenu />
                <OrderPeek />
                <AdminBell />
                {/* App ↔ Klassik-Umschalter (hier immer Klassik-Nutzer) */}
                <ViewSwitch current="classic" />
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
