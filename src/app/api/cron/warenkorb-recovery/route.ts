import { NextRequest, NextResponse } from "next/server";
import { abandonedCarts, cartErinnertMarkieren } from "@/lib/db/cart-server";
import { loadBroadcastBotToken } from "@/lib/telegram/neuheiten";
import { sendMessage, type InlineKeyboardMarkup } from "@/lib/telegram/client";
import { kaufenGesperrt } from "@/lib/db/feature-flags";
import { getSiteUrl } from "@/lib/site-url";
import { cronGuard } from "@/lib/auth/cron-guard";

export const dynamic     = "force-dynamic";
export const maxDuration = 60;

/* ──────────────────────────────────────────────────────────────────────────
 * GET /api/cron/warenkorb-recovery
 *
 * Erinnert Kunden mit verlassenem Warenkorb per Telegram-Push („dein Stück
 * wartet noch"). Nutzt den bestehenden Server-Cart (sebo.carts).
 *
 * Idempotent: jeder Cart wird pro Abbruch nur EINMAL erinnert (carts.erinnert_am).
 * Ändert der Kunde den Cart später, wird er nach erneutem Verfall wieder
 * erinnerbar.
 *
 * Fail-safe: im Schaufenster-Modus (kaufen_aktiv=false / EMERGENCY_SHOP_DISABLE)
 * wird NICHT zum Kauf gedrängt → Job no-op.
 *
 * Auth: Header „x-cron-secret" muss CRON_SECRET matchen.
 *
 * Cron-Setup (Coolify Scheduled Task / cron-job.org), z.B. stündlich:
 *   curl -H "x-cron-secret: $CRON_SECRET" \
 *     https://galerie.apps.dadakaev.tech/api/cron/warenkorb-recovery
 *   Schedule: 0 * * * *
 *
 * Optionaler Query-Param ?stunden=<1..168> (Default 6) — wie lange ein Cart
 * unberührt sein muss, bevor erinnert wird.
 * ────────────────────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  // Timing-sicherer Secret-Vergleich via cronGuard (verhindert Timing Side-Channel).
  const unauth = cronGuard(req);
  if (unauth) return unauth;

  // Schaufenster-Modus → keine Kauf-Nudges.
  if (await kaufenGesperrt()) {
    return NextResponse.json({ ok: true, skipped: "showcase-mode", sent: 0 });
  }

  const stundenRaw = Number(new URL(req.url).searchParams.get("stunden"));
  const stunden    = Number.isFinite(stundenRaw) && stundenRaw >= 1 && stundenRaw <= 168
    ? Math.floor(stundenRaw)
    : 6;

  const carts = await abandonedCarts(stunden).catch(() => []);
  if (carts.length === 0) {
    return NextResponse.json({ ok: true, kandidaten: 0, sent: 0 });
  }

  const token = await loadBroadcastBotToken();
  if (!token) {
    return NextResponse.json({ error: "Бот не настроен (нет токена)" }, { status: 503 });
  }

  const siteBase = getSiteUrl();
  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [[{ text: "🛍 Открыть корзину", web_app: { url: `${siteBase}/tg/cart` } }]],
  };

  const erinnert: string[] = [];
  for (const c of carts) {
    const anzahl = c.items.reduce((acc, i) => acc + (i.menge ?? 1), 0);
    const ersterName = c.items[0]?.name ?? "товар";
    const hallo = c.vorname ? `${escapeHtml(c.vorname)}, ` : "";
    const text =
      `🛍 <b>${hallo}ваша находка ещё ждёт</b>\n\n` +
      `В корзине ${anzahl === 1 ? "" : `${anzahl} × `}<b>${escapeHtml(ersterName)}</b>` +
      `${c.items.length > 1 ? ` и ещё кое-что` : ""}.\n\n` +
      `<i>Винтаж — часто единственный экземпляр. Успейте, пока он ваш.</i>`;

    try {
      await sendMessage(token, c.chat_id, text, { parse_mode: "HTML", reply_markup: keyboard });
      erinnert.push(c.customer_id);
    } catch (err) {
      console.error("[cron warenkorb-recovery] send", c.customer_id, err);
    }
  }

  // Nur die wirklich erfolgreich erinnerten markieren (Rest bleibt erinnerbar).
  await cartErinnertMarkieren(erinnert).catch(() => {});

  return NextResponse.json({ ok: true, kandidaten: carts.length, sent: erinnert.length });
}

/** Minimal-HTML-Escape für Telegram parse_mode=HTML. */
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
