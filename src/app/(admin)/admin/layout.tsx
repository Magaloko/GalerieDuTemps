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
  // Server-seitige Auth-Prüfung (zusätzlich zur Middleware)
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <AuthSessionProvider session={session}>
      <div className="min-h-screen bg-vintage-parchment">
        {/* Sidebar */}
        <AdminSidebar
          userName={session.user?.name}
          userEmail={session.user?.email}
        />

        {/* Hauptinhalt – verschoben um Sidebar-Breite */}
        <div className="ml-64 flex flex-col min-h-screen">
          {/* Top Bar */}
          <header className="sticky top-0 z-30 bg-vintage-parchment/95 backdrop-blur border-b border-vintage-sand px-8 py-4">
            <div className="flex items-center justify-between">
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

          {/* Seiteninhalt */}
          <main className="flex-1 px-8 py-8">
            {children}
          </main>
        </div>
      </div>
    </AuthSessionProvider>
  );
}
