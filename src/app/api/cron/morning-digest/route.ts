import { NextRequest, NextResponse } from "next/server";
import { adminBadgeCounts, umsatzTrend } from "@/lib/db/dashboard-v2";
import { notifyAdminsTelegram } from "@/lib/notifications/admin-telegram";
import { formatPreis } from "@/lib/utils/preis";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic     = "force-dynamic";
export const maxDuration = 30;

/* ──────────────────────────────────────────────────────────────────────────
 * GET /api/cron/morning-digest
 *
 * Täglicher Morgen-Digest (z.B. 09:00 Almaty) an alle verknüpften Admins
 * via Telegram. Zeigt: was heute zu tun ist + gestriger Umsatz.
 *
 * Auth: Header „x-cron-secret" muss CRON_SECRET matchen. Verhindert dass
 * jemand den Endpoint von außen triggert + Admins spammt.
 *
 * Cron-Setup (Coolify Scheduled Task / externes cron-job.org):
 *   curl -H "x-cron-secret: $CRON_SECRET" \
 *     https://galerie.apps.dadakaev.tech/api/cron/morning-digest
 *   Schedule: 0 3 * * *  (03:00 UTC = 09:00 Almaty UTC+6)
 * ────────────────────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [badges, trend] = await Promise.all([
    adminBadgeCounts().catch(() => null),
    umsatzTrend().catch(() => null),
  ]);

  if (!badges) {
    return NextResponse.json({ ok: false, error: "stats unavailable" }, { status: 500 });
  }

  const siteBase = getSiteUrl();
  const heute    = new Date().toLocaleDateString("ru-RU", {
    weekday: "long", day: "numeric", month: "long",
  });

  // Zeilen nur zeigen wenn Count > 0 (kein Rauschen)
  const zeilen: string[] = [];
  if (badges.orders_pending > 0)       zeilen.push(`📦 Заказов к отправке: <b>${badges.orders_pending}</b>`);
  if (badges.leads_unread > 0)         zeilen.push(`💬 Новых сообщений: <b>${badges.leads_unread}</b>`);
  if (badges.kontakt_neu > 0)          zeilen.push(`✉️ Контакт-форм: <b>${badges.kontakt_neu}</b>`);
  if (badges.b2b_pending > 0)          zeilen.push(`🏢 B2B-заявок: <b>${badges.b2b_pending}</b>`);
  if (badges.crm_tasks_today > 0)      zeilen.push(`✓ Задач на сегодня: <b>${badges.crm_tasks_today}</b>`);
  if (badges.auszahlungen_pending > 0) zeilen.push(`💸 Выплат в очереди: <b>${badges.auszahlungen_pending}</b>`);

  const gesternUmsatz = trend
    ? `\n💰 Вчера: <b>${formatPreis(trend.gestern_cents / 100)}</b>` +
      (trend.heute_cents > 0 ? ` · сегодня уже ${formatPreis(trend.heute_cents / 100)}` : "")
    : "";

  const text =
    `☀️ <b>Доброе утро!</b>\n` +
    `<i>${heute}</i>\n\n` +
    (zeilen.length > 0
      ? zeilen.join("\n")
      : "✓ Всё чисто — нет срочных задач.") +
    gesternUmsatz;

  const { sent } = await notifyAdminsTelegram(text, {
    keyboard: {
      inline_keyboard: [[
        { text: "🛡 Открыть Admin", web_app: { url: `${siteBase}/tg/admin` } },
      ]],
    },
  });

  return NextResponse.json({ ok: true, sent });
}
