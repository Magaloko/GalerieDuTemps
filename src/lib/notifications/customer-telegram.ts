import { query } from "@/lib/db";
import { sendMessage } from "@/lib/telegram/client";
import { formatPreis } from "@/lib/utils/preis";

/* ──────────────────────────────────────────────────────────────────────────
 * Customer-Telegram-Notifications
 *
 * Phase B1 Iteration 2: Send-Pfad für Bestell-Events.
 *
 * Alle Funktionen sind „fire-and-forget" — sie werfen NIE, sondern loggen
 * Fehler nur. Der Caller (Order-Lifecycle) soll nicht blockiert oder gar
 * rolled-back werden wenn Telegram unerreichbar ist.
 *
 * Lookup-Pfad:
 *   orderId → orders.customer_id → customers.telegram_chat_id + .notifications_aktiv
 *   konto (sebo.kanal_konten) → access_token
 *
 * Performance: 1 SQL-Roundtrip pro Notification (LEFT JOIN customer + konto).
 * Wenn die App viele Orders gleichzeitig statusiert, könnte man batchen —
 * für jetzt unnötig.
 * ────────────────────────────────────────────────────────────────────────── */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "https://galeriedutemps.kz";

interface NotificationContext {
  chatId:     number;
  botToken:   string;
  customerVorname: string | null;
  orderNumber: number;
  total_cents: number;
  bestellnummer: string;
  orderUrl:    string;
}

async function loadContext(orderId: string): Promise<NotificationContext | null> {
  // Single JOIN-Query: order → customer → bot. Wenn IRGENDETWAS davon fehlt
  // (Customer ohne Account, ohne Telegram, Notifications off, Bot unkonfiguriert)
  // ist das Ergebnis leer und wir senden nichts.
  const r = await query<{
    order_number:        number;
    total_cents:         number;
    customer_vorname:    string | null;
    chat_id:             string;     // BIGINT als string aus pg
    notifications_aktiv: boolean;
    bot_access_token:    string | null;
  }>(
    `SELECT
       o.order_number,
       o.total_cents,
       c.vorname                         AS customer_vorname,
       c.telegram_chat_id                AS chat_id,
       c.telegram_notifications_aktiv    AS notifications_aktiv,
       k.access_token                    AS bot_access_token
     FROM sebo.orders o
     JOIN sebo.customers c ON c.id = o.customer_id
     LEFT JOIN LATERAL (
       SELECT access_token FROM sebo.kanal_konten
       WHERE kanal = 'telegram' AND aktiv = true
       ORDER BY id DESC LIMIT 1
     ) k ON true
     WHERE o.id = $1
       AND c.telegram_chat_id IS NOT NULL
       AND c.telegram_notifications_aktiv = true
       AND k.access_token IS NOT NULL`,
    [orderId],
  );
  const row = r.rows[0];
  if (!row) return null;
  return {
    chatId:          Number(row.chat_id),
    botToken:        row.bot_access_token!,
    customerVorname: row.customer_vorname,
    orderNumber:     row.order_number,
    total_cents:     row.total_cents,
    bestellnummer:   `GDT-${String(row.order_number).padStart(4, "0")}`,
    orderUrl:        `${BASE_URL}/kunde/bestellungen/${orderId}`,
  };
}

function fmtSumme(cents: number): string {
  return formatPreis(cents / 100);
}

/** Bestellung wurde gerade angelegt (vom Customer im Checkout). */
export async function notifyOrderPlaced(orderId: string): Promise<void> {
  try {
    const ctx = await loadContext(orderId);
    if (!ctx) return;
    const text =
      `🧾 Заказ принят\n\n` +
      `${ctx.bestellnummer} · ${fmtSumme(ctx.total_cents)}\n\n` +
      `${ctx.customerVorname ? `Спасибо, ${ctx.customerVorname}! ` : ""}` +
      `Мы получили твой заказ. После оплаты пришлём подтверждение и упакуем для отправки.\n\n` +
      `Детали: ${ctx.orderUrl}`;
    await sendMessage(ctx.botToken, ctx.chatId, text, { parse_mode: "HTML" })
      .catch(err => console.warn("[notifyOrderPlaced]", err));
  } catch (err) {
    console.warn("[notifyOrderPlaced ctx]", err);
  }
}

/** Bestellung wurde bezahlt (Stripe-Webhook). */
export async function notifyOrderPaid(orderId: string): Promise<void> {
  try {
    const ctx = await loadContext(orderId);
    if (!ctx) return;
    const text =
      `✓ Оплата получена\n\n` +
      `${ctx.bestellnummer} · ${fmtSumme(ctx.total_cents)}\n\n` +
      `Спасибо! Готовим заказ к отправке — пришлём номер трекинга, как только посылка будет у курьера.`;
    await sendMessage(ctx.botToken, ctx.chatId, text, { parse_mode: "HTML" })
      .catch(err => console.warn("[notifyOrderPaid]", err));
  } catch (err) {
    console.warn("[notifyOrderPaid ctx]", err);
  }
}

/** Bestellung wurde versendet (Admin markiert + optional Tracking-URL). */
export async function notifyOrderShipped(
  orderId: string,
  tracking?: { nummer?: string; url?: string },
): Promise<void> {
  try {
    const ctx = await loadContext(orderId);
    if (!ctx) return;
    let text =
      `📦 Заказ отправлен\n\n` +
      `${ctx.bestellnummer}\n`;
    if (tracking?.nummer) text += `\nТрек-номер: <code>${tracking.nummer}</code>`;
    if (tracking?.url)    text += `\n${tracking.url}`;
    text += `\n\nСтатус заказа: ${ctx.orderUrl}`;
    await sendMessage(ctx.botToken, ctx.chatId, text, { parse_mode: "HTML" })
      .catch(err => console.warn("[notifyOrderShipped]", err));
  } catch (err) {
    console.warn("[notifyOrderShipped ctx]", err);
  }
}

/** Bestellung wurde storniert (Admin oder Auto-Cancel). */
export async function notifyOrderCancelled(
  orderId: string,
  grund?: string,
): Promise<void> {
  try {
    const ctx = await loadContext(orderId);
    if (!ctx) return;
    const text =
      `⚠ Заказ отменён\n\n` +
      `${ctx.bestellnummer}\n` +
      (grund ? `\nПричина: ${grund}\n` : "") +
      `\nЕсли это ошибка, напиши нам — bonjour@galeriedutemps.kz`;
    await sendMessage(ctx.botToken, ctx.chatId, text)
      .catch(err => console.warn("[notifyOrderCancelled]", err));
  } catch (err) {
    console.warn("[notifyOrderCancelled ctx]", err);
  }
}
