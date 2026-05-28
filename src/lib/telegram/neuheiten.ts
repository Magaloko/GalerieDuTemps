import { query } from "@/lib/db";
import { katalogProdukte } from "@/lib/db/produkte-public";
import { kontaktKanaeleLaden } from "@/lib/db/kontakt-kanaele";
import { sendMessage, sendPhoto, type InlineKeyboardMarkup } from "./client";
import { getSiteUrl } from "@/lib/site-url";
import { formatPreis } from "@/lib/utils/preis";
import { escapeHtml } from "@/lib/utils/escape-html";
import type { ProduktListItem } from "@/types/produkt";

/* ──────────────────────────────────────────────────────────────────────────
 * Neuheiten — /neu-Befehl + New-Arrivals-Broadcast in den Telegram-Kanal
 *
 * Zwei Wege:
 *  1. /neu (privater Bot-Chat): neueste Stücke als Liste mit web_app-Buttons
 *     (öffnen die Mini-App direkt beim Produkt). web_app-Buttons gehen NUR in
 *     privaten Chats.
 *  2. Kanal-Broadcast: ein Foto-Post je Stück in den öffentlichen Kanal
 *     (@channel). In Kanälen sind NUR url-Buttons erlaubt → Link auf die
 *     Website-Produktseite.
 * ────────────────────────────────────────────────────────────────────────── */

/** Bot-Token aus kanal_konten (gleicher Bot wie Notifications). */
export async function loadBroadcastBotToken(): Promise<string | null> {
  try {
    const r = await query<{ access_token: string | null }>(
      `SELECT access_token FROM sebo.kanal_konten
       WHERE kanal = 'telegram' AND aktiv = true
       ORDER BY id DESC LIMIT 1`,
    );
    return r.rows[0]?.access_token ?? null;
  } catch {
    return null;
  }
}

/** Neueste, öffentlich sichtbare Stücke. */
export async function neuheitenLaden(limit = 6): Promise<ProduktListItem[]> {
  const { items } = await katalogProdukte({ sortierung: "neu", limit }).catch(() => ({ items: [] as ProduktListItem[] }));
  return items;
}

/**
 * /neu-Antwort: Text + web_app-Keyboard (ein Button je Stück → Mini-App).
 * `kaufenAktiv` steuert nur das Label des Sammel-Buttons (Vitrine/Shop).
 */
export function neuheitenNachricht(
  items:       ProduktListItem[],
  siteBase:    string,
  kaufenAktiv = true,
): { text: string; keyboard: InlineKeyboardMarkup } {
  if (items.length === 0) {
    return {
      text: "✦ <b>Новинки</b>\n\n<i>Пока нет новых поступлений — загляните позже.</i>",
      keyboard: { inline_keyboard: [[{ text: kaufenAktiv ? "🛍 Открыть магазин" : "🛍 Открыть витрину", web_app: { url: `${siteBase}/tg` } }]] },
    };
  }

  const zeilen = items.map(p => {
    const preis = formatPreis(p.preis, (p.waehrung as "KZT"|"EUR"|"USD"|"RUB"|undefined) ?? "KZT");
    const tag   = p.reserviert ? " · ⏳ бронь" : "";
    return `• <b>${escapeHtml(p.name)}</b> — ${preis}${tag}`;
  });

  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
      ...items.slice(0, 6).map(p => [{
        text:    `${p.name.slice(0, 40)} →`,
        web_app: { url: `${siteBase}/tg/produkt/${p.slug}` },
      }]),
      [{ text: kaufenAktiv ? "🛍 Все новинки" : "🛍 Вся витрина", web_app: { url: `${siteBase}/tg` } }],
    ],
  };

  return {
    text: `✦ <b>Новые поступления</b>\n\n${zeilen.join("\n")}`,
    keyboard,
  };
}

export type BroadcastErgebnis = { ok: true } | { ok: false; error: string };

/** Ein einzelnes Stück in den öffentlichen Kanal posten (Foto + url-Button). */
export async function broadcastProduktInKanal(produkt: {
  slug:          string;
  name:          string;
  preis:         number;
  waehrung?:     string | null;
  hauptbild_url: string | null;
}): Promise<BroadcastErgebnis> {
  const token = await loadBroadcastBotToken();
  if (!token) return { ok: false, error: "Бот не настроен (нет токена)" };

  const { telegram_channel } = await kontaktKanaeleLaden();
  const ch = (telegram_channel ?? "").replace(/^@/, "").trim();
  if (!ch) return { ok: false, error: "Канал не указан (Настройки → Контакты)" };

  const siteBase = getSiteUrl();
  const preis    = formatPreis(produkt.preis, (produkt.waehrung as "KZT"|"EUR"|"USD"|"RUB"|undefined) ?? "KZT");
  const caption  =
    `✦ <b>Новое поступление</b>\n\n` +
    `<b>${escapeHtml(produkt.name)}</b>\n${preis}`;
  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [[{ text: "Смотреть в Galerie", url: `${siteBase}/katalog/${produkt.slug}` }]],
  };

  try {
    if (produkt.hauptbild_url) {
      await sendPhoto(token, `@${ch}`, produkt.hauptbild_url, { caption, parse_mode: "HTML", reply_markup: keyboard });
    } else {
      await sendMessage(token, `@${ch}`, caption, { parse_mode: "HTML", reply_markup: keyboard });
    }
    return { ok: true };
  } catch (err) {
    console.error("[broadcastProduktInKanal]", err);
    return { ok: false, error: err instanceof Error ? err.message : "Ошибка отправки в канал" };
  }
}

/**
 * Auto-Broadcast beim Veröffentlichen — feuert GENAU EINMAL pro Stück.
 * Guards (alle müssen erfüllt sein): Schalter `auto_broadcast_neu` an, Stück
 * aktiv & nicht verkauft, hat ein Hauptbild, und noch nie gepostet
 * (kanal_gepostet_am IS NULL). Best-effort — wirft nie (darf den Publish-Flow
 * nicht brechen). Setzt nach Erfolg den Idempotenz-Stempel.
 */
export async function autoBroadcastBeiPublish(produktId: string): Promise<void> {
  try {
    const { autoBroadcastAktiv } = await import("@/lib/db/feature-flags");
    if (!(await autoBroadcastAktiv())) return;

    const r = await query<{
      slug: string; name: string; preis: number; waehrung: string | null;
      hauptbild_url: string | null; aktiv: boolean; verkauft: boolean; bereits: string | null;
    }>(
      `SELECT p.slug, p.name, p.preis, p.waehrung, p.aktiv, p.verkauft,
              p.kanal_gepostet_am AS bereits,
              COALESCE(p.hauptbild_url,
                (SELECT pb.url FROM sebo.produktbilder pb WHERE pb.produkt_id = p.id
                 ORDER BY pb.ist_hauptbild DESC, pb.sortierung LIMIT 1)
              ) AS hauptbild_url
         FROM sebo.produkte p WHERE p.id = $1`,
      [produktId],
    );
    const p = r.rows[0];
    if (!p || p.bereits || !p.aktiv || p.verkauft || !p.hauptbild_url) return;

    const res = await broadcastProduktInKanal({
      slug: p.slug, name: p.name, preis: Number(p.preis), waehrung: p.waehrung, hauptbild_url: p.hauptbild_url,
    });
    if (res.ok) {
      await query(`UPDATE sebo.produkte SET kanal_gepostet_am = now() WHERE id = $1`, [produktId]);
    }
  } catch (err) {
    console.warn("[autoBroadcastBeiPublish]", err);
  }
}

/** Idempotenz-Stempel nach manuellem Broadcast setzen (best-effort). */
export async function markKanalGepostet(produktId: string): Promise<void> {
  try {
    await query(`UPDATE sebo.produkte SET kanal_gepostet_am = now() WHERE id = $1`, [produktId]);
  } catch {/* ignore */}
}
