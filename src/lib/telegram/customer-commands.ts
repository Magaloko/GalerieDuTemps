import { query } from "@/lib/db";
import { sendMessage } from "@/lib/telegram/client";
import { formatPreis } from "@/lib/utils/preis";
import { getSiteUrl } from "@/lib/site-url";
import { escapeHtml } from "@/lib/utils/escape-html";
import type { Customer } from "@/types/commerce";

/* ──────────────────────────────────────────────────────────────────────────
 * Customer-Bot-Commands (Phase B3)
 *
 * Wird vom Webhook gerufen wenn eingehende Message von verknüpftem Customer
 * mit "/" beginnt. Returned true wenn Command erkannt + verarbeitet wurde,
 * sonst false (Caller darf dann Lead oder Ack senden).
 *
 * Commands:
 *   /orders         — letzte 5 Bestellungen mit Status + Total
 *   /status <num>   — Detail einer Bestellung (GDT-0042 oder 0042)
 *   /wishlist       — Hinweis dass Wishlist nur auf Website (kein Server-Side State)
 *   /help           — Übersicht aller Commands
 * ────────────────────────────────────────────────────────────────────────── */

// BASE_URL muss lazy resolved werden — getSiteUrl liest ENV-Variablen, und
// wenn dieses Modul beim Import gerendert wird (Tree-Shake), ist der Wert
// gecacht. In Server-Routes wird's pro Request frisch geholt.
function baseUrl(): string {
  return getSiteUrl();
}

interface CommandCtx {
  botToken: string;
  chatId:   number;
  customer: Customer;
}

const STATUS_LABEL: Record<string, string> = {
  pending:   "⏳ Ожидает оплаты",
  paid:      "✓ Оплачено",
  fulfilled: "📦 Отправлено",
  completed: "✓ Завершено",
  cancelled: "✗ Отменено",
  refunded:  "↩ Возврат",
};

function fmtBestellnummer(n: number): string {
  return `GDT-${String(n).padStart(4, "0")}`;
}

function fmtSumme(cents: number): string {
  return formatPreis(cents / 100);
}

/** Hauptdispatcher — gibt true zurück wenn die Message ein Command war. */
export async function handleCustomerCommand(
  text: string,
  ctx: CommandCtx,
): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return false;

  // Erstes Wort = Command, Rest = Args (für /status <nummer>)
  const [cmd, ...argParts] = trimmed.split(/\s+/);
  const arg = argParts.join(" ").trim();

  switch (cmd.toLowerCase()) {
    case "/orders":
    case "/bestellungen":
      await cmdOrders(ctx);
      return true;

    case "/status":
    case "/order":
      await cmdStatus(ctx, arg);
      return true;

    case "/wishlist":
    case "/favoriten":
    case "/избранное":
      await cmdWishlist(ctx);
      return true;

    case "/help":
    case "/start":   // hier shouldn't reach because start ist im webhook gefiltert
      await cmdHelp(ctx);
      return true;

    default:
      // Unknown command → behandelt als nicht-erkannt, Caller entscheidet
      return false;
  }
}

/** /orders — letzte 5 Bestellungen. */
async function cmdOrders(ctx: CommandCtx): Promise<void> {
  const r = await query<{
    id:           string;
    order_number: number;
    status:       string;
    total_cents:  number;
    erstellt_am:  string;
  }>(
    `SELECT id, order_number, status, total_cents, erstellt_am
     FROM sebo.orders
     WHERE customer_id = $1
     ORDER BY erstellt_am DESC
     LIMIT 5`,
    [ctx.customer.id],
  );

  if (r.rows.length === 0) {
    await sendMessage(
      ctx.botToken, ctx.chatId,
      `У тебя пока нет заказов.\n\nКаталог: ${baseUrl()}/katalog`,
    ).catch(err => console.warn("[cmd-orders]", err));
    return;
  }

  const lines = r.rows.map(o => {
    const datum = new Date(o.erstellt_am).toLocaleDateString("ru-RU", {
      day: "numeric", month: "short",
    });
    const label = STATUS_LABEL[o.status] ?? o.status;
    return `<b>${fmtBestellnummer(o.order_number)}</b> · ${datum}\n${label} · ${fmtSumme(o.total_cents)}`;
  });

  const text =
    `📋 <b>Твои последние заказы</b>\n\n` +
    lines.join("\n\n") +
    `\n\nДетали любого заказа: <code>/status &lt;номер&gt;</code>\n` +
    `Например: <code>/status ${fmtBestellnummer(r.rows[0].order_number)}</code>`;

  await sendMessage(ctx.botToken, ctx.chatId, text, { parse_mode: "HTML" })
    .catch(err => console.warn("[cmd-orders send]", err));
}

/** /status <nummer> — Detail einer Bestellung. */
async function cmdStatus(ctx: CommandCtx, arg: string): Promise<void> {
  if (!arg) {
    await sendMessage(
      ctx.botToken, ctx.chatId,
      `Используй: <code>/status &lt;номер&gt;</code>\nПример: <code>/status GDT-0042</code>`,
      { parse_mode: "HTML" },
    ).catch(err => console.warn("[cmd-status help]", err));
    return;
  }

  // Akzeptiere "GDT-0042", "0042", "42", "#42"
  const nMatch = arg.match(/(\d+)/);
  if (!nMatch) {
    await sendMessage(
      ctx.botToken, ctx.chatId,
      `Не смог распознать номер. Используй формат: <code>GDT-0042</code> или просто <code>42</code>.`,
      { parse_mode: "HTML" },
    ).catch(err => console.warn("[cmd-status badnum]", err));
    return;
  }
  const orderNumber = parseInt(nMatch[1], 10);

  const r = await query<{
    id:              string;
    order_number:    number;
    status:          string;
    total_cents:     number;
    erstellt_am:     string;
    bezahlt_am:      string | null;
    versendet_am:    string | null;
    tracking_nummer: string | null;
    tracking_url:    string | null;
  }>(
    `SELECT id, order_number, status, total_cents,
            erstellt_am, bezahlt_am, versendet_am, tracking_nummer, tracking_url
     FROM sebo.orders
     WHERE customer_id = $1 AND order_number = $2
     LIMIT 1`,
    [ctx.customer.id, orderNumber],
  );
  const o = r.rows[0];
  if (!o) {
    await sendMessage(
      ctx.botToken, ctx.chatId,
      `Заказ ${fmtBestellnummer(orderNumber)} не найден или не принадлежит тебе.`,
    ).catch(err => console.warn("[cmd-status notfound]", err));
    return;
  }

  const label = STATUS_LABEL[o.status] ?? o.status;
  let text =
    `<b>${fmtBestellnummer(o.order_number)}</b>\n` +
    `${label}\n` +
    `Сумма: <b>${fmtSumme(o.total_cents)}</b>\n\n` +
    `Создан: ${new Date(o.erstellt_am).toLocaleString("ru-RU")}`;
  if (o.bezahlt_am)   text += `\nОплачен: ${new Date(o.bezahlt_am).toLocaleString("ru-RU")}`;
  if (o.versendet_am) text += `\nОтправлен: ${new Date(o.versendet_am).toLocaleString("ru-RU")}`;
  if (o.tracking_nummer) text += `\n\nТрек-номер: <code>${escapeHtml(o.tracking_nummer)}</code>`;
  if (o.tracking_url && /^https?:\/\//i.test(o.tracking_url)) text += `\n${escapeHtml(o.tracking_url)}`;
  text += `\n\nПолностью: ${baseUrl()}/kunde/bestellungen/${o.id}`;

  await sendMessage(ctx.botToken, ctx.chatId, text, { parse_mode: "HTML" })
    .catch(err => console.warn("[cmd-status send]", err));
}

/** /wishlist — Server hat keine Server-Side Wishlist, Verweis auf Web. */
async function cmdWishlist(ctx: CommandCtx): Promise<void> {
  await sendMessage(
    ctx.botToken, ctx.chatId,
    `Избранное хранится в браузере на сайте:\n${baseUrl()}/wunschliste\n\n` +
    `(В будущей версии — прямо в боте.)`,
  ).catch(err => console.warn("[cmd-wishlist]", err));
}

/** /help — Liste aller Commands. */
async function cmdHelp(ctx: CommandCtx): Promise<void> {
  const text =
    `<b>Galerie du Temps — команды бота</b>\n\n` +
    `<code>/orders</code> — последние 5 заказов\n` +
    `<code>/status &lt;номер&gt;</code> — детали заказа (например: <code>/status GDT-0042</code>)\n` +
    `<code>/wishlist</code> — избранное\n` +
    `<code>/unlink</code> — отвязать аккаунт\n\n` +
    `Уведомления о заказах приходят автоматически.\n` +
    `Профиль: ${baseUrl()}/kunde/profil`;
  await sendMessage(ctx.botToken, ctx.chatId, text, { parse_mode: "HTML" })
    .catch(err => console.warn("[cmd-help]", err));
}
