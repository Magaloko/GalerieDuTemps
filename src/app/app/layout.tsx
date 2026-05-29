import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { AuthSessionProvider } from "@/components/layout/session-provider";
import { AppShell } from "./app-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:  "Galerie · Админ-приложение",
  robots: { index: false, follow: false },
};

/* ──────────────────────────────────────────────────────────────────────────
 * /app — eigenständige mobile Operator-App (Amina-/FB-Business-Suite-Stil).
 *
 * Gleiche serverseitige Rollen-Prüfung wie /admin (admin|superadmin), sonst
 * Redirect. Hülle = AppShell (Top-Bar + untere Tab-Bar). Unterseiten leben
 * teils hier (Сегодня, Меню), teils verlinken sie in die /admin-Seiten.
 * ────────────────────────────────────────────────────────────────────────── */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
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
      <AppShell userName={session.user?.name}>{children}</AppShell>
    </AuthSessionProvider>
  );
}
