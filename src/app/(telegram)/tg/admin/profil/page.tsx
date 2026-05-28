import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { TelegramAuthGate } from "../../auth-gate";
import { AdminBack, AdminHeader, AdminNotAllowed } from "../_ui";
import { adminProfilLaden } from "@/lib/db/admin-telegram";
import { AdminProfilClient } from "./profil-client";
import { Send, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Профиль · Mini-App", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /tg/admin/profil — Admin-Profil in der Mini-App.
 *
 * Zeigt den Telegram-Verknüpfungs-Status (read-only — der Admin ist bereits
 * verknüpft, sonst wäre er nicht hier), den Push-Benachrichtigungs-Schalter
 * und die eigenen Kontaktdaten.
 * ────────────────────────────────────────────────────────────────────────── */
export default async function TgAdminProfilPage() {
  const session = await getWebAppSession();
  if (!session || session.role !== "admin") {
    return <TelegramAuthGate><AdminNotAllowed /></TelegramAuthGate>;
  }

  const profil = await adminProfilLaden(session.subjectId).catch(() => null);
  if (!profil) {
    return (
      <TelegramAuthGate>
        <main className="p-4">
          <AdminBack />
          <p className="mt-6 text-sm text-center" style={{ color: "var(--color-ink-mute)" }}>
            Профиль не найден.
          </p>
        </main>
      </TelegramAuthGate>
    );
  }

  const linked    = profil.telegram_chat_id != null;
  const linkedDat = profil.telegram_verknuepft_am
    ? new Date(profil.telegram_verknuepft_am).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <TelegramAuthGate>
      <main className="p-4 pb-10">
        <AdminBack />
        <AdminHeader
          eyebrow="✦ Профиль"
          titel={profil.name ?? profil.email}
          sub={profil.rolle === "superadmin" ? "Супер-админ" : "Администратор"}
        />

        {/* Telegram-Verknüpfung (read-only) */}
        <div className="flex items-center gap-3 p-3 mb-5"
          style={{ background: "var(--tg-theme-section-bg-color, #fff)", border: "1px solid var(--color-line)", borderLeft: "3px solid #52663F" }}>
          <Send className="w-4 h-4 shrink-0" style={{ color: "#52663F" }} />
          <div className="flex-1 min-w-0">
            <p className="flex items-center gap-1 text-sm" style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }}>
              {linked ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#52663F" }} />
                  Telegram подключён
                </>
              ) : "Telegram не подключён"}
            </p>
            <p className="text-[11px]" style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
              {profil.telegram_username ? `@${profil.telegram_username}` : ""}
              {linkedDat ? ` · с ${linkedDat}` : ""}
            </p>
          </div>
        </div>

        <AdminProfilClient
          initial={{
            notifications_aktiv: profil.notifications_aktiv,
            telefon:             profil.telefon,
            whatsapp:            profil.whatsapp,
            kontakt_kanal:       profil.kontakt_kanal,
          }}
        />
      </main>
    </TelegramAuthGate>
  );
}
