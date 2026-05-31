import { NextRequest, NextResponse } from "next/server";
import { reservierungenBaldFaellig, reservierungenErinnertMarkieren } from "@/lib/db/produkte";
import { notifyAdminsTelegram } from "@/lib/notifications/admin-telegram";
import { getSiteUrl } from "@/lib/site-url";
import { cronGuard } from "@/lib/auth/cron-guard";

export const dynamic     = "force-dynamic";
export const maxDuration = 30;

/* ──────────────────────────────────────────────────────────────────────────
 * GET /api/cron/reservierungen-ablauf
 *
 * Erinnert den Kurator via Telegram an Reservierungen, deren 48h-Frist bald
 * (Default: innerhalb 12h) ausläuft — damit nachgefasst oder verlängert werden
 * kann, bevor das Stück automatisch wieder frei wird.
 *
 * Idempotent pro Reservierung: jedes Stück wird nur EINMAL erinnert
 * (reservierung_erinnert_am). Beim Setzen einer neuen Reservierung wird das
 * Feld zurückgesetzt (produktReservieren), sodass die nächste Frist wieder
 * erinnert wird.
 *
 * Auth: Header „x-cron-secret" muss CRON_SECRET matchen.
 *
 * Cron-Setup (Coolify Scheduled Task / cron-job.org), z.B. stündlich:
 *   curl -H "x-cron-secret: $CRON_SECRET" \
 *     https://galerie.apps.dadakaev.tech/api/cron/reservierungen-ablauf
 *   Schedule: 0 * * * *
 *
 * Optionaler Query-Param ?fenster=<stunden> (1–48, Default 12).
 * ────────────────────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  // Timing-sicherer Secret-Vergleich via cronGuard (verhindert Timing Side-Channel).
  const unauth = cronGuard(req);
  if (unauth) return unauth;

  const fensterRaw = Number(new URL(req.url).searchParams.get("fenster"));
  const fenster    = Number.isFinite(fensterRaw) && fensterRaw >= 1 && fensterRaw <= 48
    ? Math.floor(fensterRaw)
    : 12;

  const faellig = await reservierungenBaldFaellig(fenster).catch(() => []);
  if (faellig.length === 0) {
    return NextResponse.json({ ok: true, faellig: 0, sent: 0 });
  }

  const siteBase = getSiteUrl();
  const zeilen = faellig.map(r => {
    const rest = r.stunden_rest <= 1 ? "< 1 ч" : `~${r.stunden_rest} ч`;
    const fuer = r.reserviert_von ? ` · <i>${escapeHtml(r.reserviert_von)}</i>` : "";
    return `⏳ <b>${escapeHtml(r.name)}</b> — осталось ${rest}${fuer}`;
  });

  const text =
    `⏳ <b>Брони истекают скоро</b>\n` +
    `<i>В ближайшие ${fenster} ч освободятся, если не продлить:</i>\n\n` +
    zeilen.join("\n");

  const { sent } = await notifyAdminsTelegram(text, {
    keyboard: {
      inline_keyboard: [[
        { text: "🛡 Открыть Admin", web_app: { url: `${siteBase}/tg/admin/produkte` } },
      ]],
    },
  });

  // Erst nach erfolgreichem Versand markieren — sonst lieber nochmal erinnern.
  if (sent > 0) {
    await reservierungenErinnertMarkieren(faellig.map(r => r.id)).catch(() => {});
  }

  return NextResponse.json({ ok: true, faellig: faellig.length, sent });
}

/** Minimal-HTML-Escape für Telegram parse_mode=HTML (Produktnamen/Lead-Handles). */
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
