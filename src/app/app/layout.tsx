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
  // Gleiche App + gleiches Icon für alle: /app ist der Operator-Einstieg
  // (Kacheln). Wer KEIN Admin ist, wird nicht auf einen Operator-Login
  // geschickt, sondern auf die passende Heimat — Gäste/Kunden → Shop,
  // Affiliates → Partner-Bereich. So startet dieselbe installierte PWA für
  // jeden sinnvoll.
  const session = await auth();
  if (!session || (session.user?.role !== "admin" && session.user?.role !== "superadmin")) {
    if (session?.user?.role === "affiliate") redirect("/affiliate");
    redirect("/");
  }

  return (
    <AuthSessionProvider session={session}>
      <AppShell userName={session.user?.name}>{children}</AppShell>
    </AuthSessionProvider>
  );
}
