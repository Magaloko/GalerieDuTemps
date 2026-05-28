import { query } from "@/lib/db";
import { sendMessage, type InlineKeyboardMarkup } from "@/lib/telegram/client";
import { getSiteUrl } from "@/lib/site-url";
import { escapeHtml } from "@/lib/utils/escape-html";

/* ──────────────────────────────────────────────────────────────────────────
 * Admin-Telegram-Notifications
 *
 * Schickt Push-Nachrichten an alle Admins/Manager die ihren Telegram-Account
 * verknüpft haben (sebo.benutzer.telegram_chat_id IS NOT NULL) und
 * notifications_aktiv = true.
 *
 * Bot-Token wird aus sebo.kanal_konten geladen (gleicher Bot wie Customer-
 * Notifications). Best-Effort — Fehler werden geloggt, nie propagiert.
 *
 * Verwendung:
 *   - notifyNewLead (ergänzt Email-Notify um Telegram-Push)
 *   - Morning-Digest (/api/cron/morning-digest)
 *   - Critical-Alerts (Refund, große Bestellung, etc.)
 * ────────────────────────────────────────────────────────────────────────── */

interface AdminTgEmpfaenger {
  id:               string;
  name:             string | null;
  telegram_chat_id: number;
}

let botTokenCache: { token: string | null; loaded: number } | null = null;
const BOT_TOKEN_TTL_MS = 60_000;

async function loadBotToken(): Promise<string | null> {
  const jetzt = Date.now();
  if (botTokenCache && jetzt - botTokenCache.loaded < BOT_TOKEN_TTL_MS) {
    return botTokenCache.token;
  }
  try {
    const r = await query<{ access_token: string | null }>(
      `SELECT access_token FROM sebo.kanal_konten
       WHERE kanal = 'telegram' AND aktiv = true
       ORDER BY id DESC LIMIT 1`,
    );
    const token = r.rows[0]?.access_token ?? null;
    botTokenCache = { token, loaded: jetzt };
    return token;
  } catch {
    return null;
  }
}

async function adminsMitTelegram(): Promise<AdminTgEmpfaenger[]> {
  try {
    const r = await query<AdminTgEmpfaenger>(
      `SELECT id, name, telegram_chat_id
       FROM sebo.benutzer
       WHERE aktiv = true
         AND rolle IN ('admin','superadmin')
         AND telegram_chat_id IS NOT NULL
         AND telegram_notifications_aktiv = true`,
    );
    return r.rows;
  } catch (err) {
    // Migration 037 evtl. nicht angewendet → silent empty
    console.warn("[adminsMitTelegram]", err);
    return [];
  }
}

/**
 * Broadcast an alle verknüpften Admins. HTML parse_mode.
 * `keyboardFor` kann pro Admin ein Inline-Keyboard bauen (z.B. WebApp-Link).
 */
export async function notifyAdminsTelegram(
  text: string,
  opts?: {
    keyboard?: InlineKeyboardMarkup;
    onlyAdminId?: string;     // nur an einen bestimmten Admin
  },
): Promise<{ sent: number }> {
  const token = await loadBotToken();
  if (!token) return { sent: 0 };

  let admins = await adminsMitTelegram();
  if (opts?.onlyAdminId) {
    admins = admins.filter(a => a.id === opts.onlyAdminId);
  }
  if (admins.length === 0) return { sent: 0 };

  let sent = 0;
  for (const admin of admins) {
    try {
      await sendMessage(token, admin.telegram_chat_id, text, {
        parse_mode:   "HTML",
        reply_markup: opts?.keyboard,
        disable_web_page_preview: true,
      });
      sent++;
    } catch (err) {
      console.error("[notifyAdminsTelegram]", admin.id, err);
    }
  }
  return { sent };
}

/* ── Convenience: Critical-Alert mit Standard-Formatierung ──────────────── */

export type CriticalAlertTyp =
  | "refund_request"
  | "large_order"
  | "payment_failed"
  | "low_stock"
  | "b2b_pending";

const ALERT_META: Record<CriticalAlertTyp, { emoji: string; label: string }> = {
  refund_request: { emoji: "↩️", label: "Запрос на возврат" },
  large_order:    { emoji: "💰", label: "Крупный заказ" },
  payment_failed: { emoji: "⚠️", label: "Ошибка оплаты" },
  low_stock:      { emoji: "📦", label: "Заканчивается товар" },
  b2b_pending:    { emoji: "🏢", label: "Новая B2B-заявка" },
};

export async function notifyAdminsCritical(
  typ: CriticalAlertTyp,
  detail: string,
  link?: string,
): Promise<void> {
  const meta = ALERT_META[typ];
  const siteBase = getSiteUrl();
  // detail kann dynamische Daten enthalten (B2B-Firma/Kontakt, Produktname) →
  // escapen, sonst kann < & das HTML-Markup brechen.
  const text =
    `${meta.emoji} <b>${meta.label}</b>\n\n${escapeHtml(detail)}`;
  const keyboard: InlineKeyboardMarkup | undefined = link
    ? { inline_keyboard: [[{ text: "Открыть", url: link.startsWith("http") ? link : `${siteBase}${link}` }]] }
    : undefined;

  await notifyAdminsTelegram(text, { keyboard }).catch(err =>
    console.error("[notifyAdminsCritical]", err),
  );
}
