import Link from "next/link";
import { ChevronLeft, Clock } from "lucide-react";
import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { aktiveReservierungen } from "@/lib/db/produkte";
import { TelegramAuthGate } from "../../auth-gate";
import { AdminNotAllowed } from "../_ui";
import { ReservierungRow } from "./reservierung-row";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:  "Брони · Mini-App",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /tg/admin/reservierungen — Übersicht aller AKTIVEN Reservierungen.
 *
 * Sortiert nach Ablauf (dringendste zuerst). Pro Eintrag: Produkt-Tap →
 * Detail, „Продлить 48ч" (Uhr neu) und „Снять" (sofort freigeben). Spiegelt
 * die Cron-Erinnerung (/api/cron/reservierungen-ablauf) als manuelle Ansicht.
 * ────────────────────────────────────────────────────────────────────────── */
export default async function TgAdminReservierungenPage() {
  const session = await getWebAppSession();
  if (!session || session.role !== "admin") {
    return <TelegramAuthGate><AdminNotAllowed /></TelegramAuthGate>;
  }

  const reservierungen = await aktiveReservierungen().catch(() => []);

  return (
    <TelegramAuthGate>
      <main className="p-4 space-y-4 pb-8">
        <nav className="text-[11px] uppercase font-medium flex items-center gap-2"
             style={{ letterSpacing: "0.18em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
          <Link href="/tg/admin/produkte" className="flex items-center gap-1" style={{ color: "var(--tg-theme-link-color, var(--color-coral))" }}>
            <ChevronLeft className="w-3 h-3" /> Товары
          </Link>
          <span>/</span>
          <span style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }}>Брони</span>
        </nav>

        <header>
          <p className="flex items-center gap-2 text-[10px] uppercase font-medium mb-1"
             style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}>
            <Clock className="w-3 h-3" /> Резервы
          </p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--tg-theme-text-color, var(--color-ink))", lineHeight: 1.1 }}>
            Активные брони · {reservierungen.length}
          </h1>
        </header>

        {reservierungen.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center gap-3" style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
            <Clock className="w-10 h-10 opacity-40" />
            <p className="text-sm">Нет активных броней.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {reservierungen.map(r => (
              <ReservierungRow
                key={r.id}
                id={r.id}
                name={r.name}
                slug={r.slug}
                preis={Number(r.preis)}
                waehrung={r.waehrung}
                bildUrl={r.hauptbild_url}
                reserviertVon={r.reserviert_von}
                stundenRest={r.stunden_rest}
              />
            ))}
          </div>
        )}
      </main>
    </TelegramAuthGate>
  );
}
