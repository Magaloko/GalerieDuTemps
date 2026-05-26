import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AuthSessionProvider } from "@/components/layout/session-provider";
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

  return (
    <AuthSessionProvider session={session}>
      <div className="min-h-screen bg-vintage-parchment">
        {/* Sidebar */}
        <AdminSidebar
          userName={session.user?.name}
          userEmail={session.user?.email}
        />

        {/* Hauptinhalt – Sidebar-Offset nur ab md (auf Mobile ist Sidebar ein Drawer) */}
        <div className="md:ml-64 flex flex-col min-h-screen">
          {/* Top Bar — auf Mobile etwas weniger Padding + Hamburger-Spacer links */}
          <header className="sticky top-0 z-20 bg-vintage-parchment/95 backdrop-blur border-b border-vintage-sand px-4 md:px-8 py-4">
            <div className="flex items-center justify-between pl-12 md:pl-0">
              <div id="admin-page-title" />
              <div className="text-xs text-vintage-dust font-sans tracking-wider">
                {new Date().toLocaleDateString("de-DE", {
                  weekday: "long",
                  day:     "numeric",
                  month:   "long",
                  year:    "numeric",
                })}
              </div>
            </div>
          </header>

          {/* Seiteninhalt — Mobile weniger horizontal padding */}
          <main className="flex-1 px-4 md:px-8 py-6 md:py-8">
            {children}
          </main>
        </div>
      </div>
    </AuthSessionProvider>
  );
}
