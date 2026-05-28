import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { TelegramAuthGate } from "../auth-gate";
import { AdminNotAllowed } from "./_ui";

export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * Admin-Layout — zentraler Server-Gate für den GESAMTEN /tg/admin-Bereich.
 *
 * Defense-in-Depth: jede einzelne Admin-Seite prüft die Rolle bereits selbst,
 * aber dieser Layout-Gate stellt sicher, dass eine künftige neue Admin-Seite
 * die Prüfung NICHT vergessen kann — ohne admin-Session rendert hier nie
 * Admin-Inhalt, egal welche Unterseite aufgerufen wird.
 *
 * Hinweis: Die endgültige Absicherung gegen ein an einen anderen Telegram-
 * Nutzer gebundenes (geerbtes) Cookie passiert in /api/telegram/whoami
 * (tgId-Mismatch → Cookie wird gelöscht); danach sieht auch dieser Server-Gate
 * keine admin-Session mehr.
 * ────────────────────────────────────────────────────────────────────────── */
export default async function TgAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getWebAppSession();
  if (!session || session.role !== "admin") {
    return <TelegramAuthGate><AdminNotAllowed /></TelegramAuthGate>;
  }
  return <>{children}</>;
}
