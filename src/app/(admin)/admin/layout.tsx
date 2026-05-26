import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminBell }    from "@/components/layout/admin-bell";
import { AuthSessionProvider } from "@/components/layout/session-provider";
import { ungeleseneCount }    from "@/lib/notifications/lead-notify";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s | Admin – Galerie du Temps",
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

  const inboxCount = await ungeleseneCount().catch(() => 0);

  return (
    <AuthSessionProvider session={session}>
      <div className="min-h-screen" style={{ background: "var(--color-paper)" }}>
        {/* Sidebar */}
        <AdminSidebar
          userName={session.user?.name}
          userEmail={session.user?.email}
          inboxCount={inboxCount}
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
            <div className="flex items-center justify-between pl-12 md:pl-0">
              <div id="admin-page-title" />
              <div className="flex items-center gap-3">
                <AdminBell />
                <div
                  className="hidden sm:block text-[11px] uppercase font-medium"
                  style={{ letterSpacing: "0.18em", color: "var(--color-ink-mute)" }}
                >
                  {new Date().toLocaleDateString("de-DE", {
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
