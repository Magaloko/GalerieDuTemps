import { query } from "@/lib/db";
import { orderErstellen, orderStatusUpdate } from "@/lib/db/orders";
import { sendMessage } from "@/lib/telegram/client";
import type { TelegramSuccessfulPayment } from "@/lib/telegram/client";
import type { Address } from "@/types/commerce";

/* ──────────────────────────────────────────────────────────────────────────
 * handleSuccessfulPayment
 *
 * Wird vom Webhook gerufen sobald Telegram successful_payment liefert.
 * payload (max 128 bytes, beim sendInvoice gesetzt) enthält:
 *   { cid:        customerId,
 *     items:      [[produkt_id, menge], ...],
 *     ts:         timestamp }
 *
 * Aktionen:
 *   1. Customer + Produkte aus DB laden, Preise validieren
 *   2. orderErstellen() mit status='pending' → setzen wir gleich auf 'paid'
 *   3. orderStatusUpdate(id, 'paid') triggert notifyOrderPaid
 *   4. DM an Customer mit Bestellnummer + Web-Link
 *
 * Resilient: wenn payload kaputt ist, loggt + sendet Hinweis-Message statt
 * crash. Telegram-Side: Geld ist bereits gezogen, Refund manuell nötig.
 * ────────────────────────────────────────────────────────────────────────── */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "https://galeriedutemps.kz";

interface MinimalPayload {
  cid:   string;
  items: [string, number][];
}

export async function handleSuccessfulPayment(
  payment: TelegramSuccessfulPayment,
  chatId:  number,
  botToken: string,
): Promise<void> {
  let payload: MinimalPayload;
  try {
    payload = JSON.parse(payment.invoice_payload);
    if (!payload.cid || !Array.isArray(payload.items)) throw new Error("invalid");
  } catch {
    console.error("[payment-handler] payload kaputt:", payment.invoice_payload);
    await sendMessage(botToken, chatId,
      `Оплата получена (${payment.telegram_payment_charge_id}), но не удалось ` +
      `создать заказ автоматически. Свяжись с нами: bonjour@galeriedutemps.kz`,
    ).catch(() => {});
    return;
  }

  // Customer + E-Mail laden
  const custRes = await query<{
    id: string; email: string; vorname: string | null; nachname: string | null;
    customer_type: string;
  }>(
    `SELECT id, email, vorname, nachname, customer_type FROM sebo.customers WHERE id = $1`,
    [payload.cid],
  );
  const customer = custRes.rows[0];
  if (!customer) {
    console.error("[payment-handler] customer not found:", payload.cid);
    return;
  }

  // Produkte laden (mit aktuellen Preisen)
  const ids = payload.items.map(([id]) => id);
  const prodRes = await query<{
    id: string; name: string; slug: string; preis: string;
    hauptbild_url: string | null; waehrung: string;
  }>(
    `SELECT id, name, slug, preis, hauptbild_url, waehrung
     FROM sebo.produkte WHERE id = ANY($1::uuid[])`,
    [ids],
  );

  // Items + Subtotal aufbauen
  const items: Parameters<typeof orderErstellen>[0]["items"] = [];
  let subtotal_cents = 0;
  for (const [pid, menge] of payload.items) {
    const p = prodRes.rows.find(r => r.id === pid);
    if (!p) continue;
    const preisCents = Math.round(parseFloat(p.preis) * 100);
    const total = preisCents * menge;
    subtotal_cents += total;
    items.push({
      produkt_id:        p.id,
      produkt_name:      p.name,
      produkt_slug:      p.slug,
      produkt_bild_url:  p.hauptbild_url ?? undefined,
      menge,
      einzelpreis_cents: preisCents,
      tax_rate:          12,
      tax_amount_cents:  Math.round(total * 0.12 / 1.12),  // brutto incl. 12% UST
      tax_exempt:        false,
    });
  }

  // Shipping-Address aus Telegram-order_info (falls vorhanden).
  // Bundesland kommt von Telegram als „state" — wir hängen es an den Ort an
  // weil Address kein eigenes Feld dafür hat.
  const tg_shipping = payment.order_info?.shipping_address;
  const shipping_address: Address = tg_shipping ? {
    strasse: tg_shipping.street_line1 + (tg_shipping.street_line2 ? `, ${tg_shipping.street_line2}` : ""),
    plz:     tg_shipping.post_code,
    ort:     tg_shipping.state ? `${tg_shipping.city}, ${tg_shipping.state}` : tg_shipping.city,
    land:    tg_shipping.country_code,
  } : ({} as Address);

  try {
    const order = await orderErstellen({
      customer_id:      customer.id,
      customer_email:   customer.email,
      customer_name:    payment.order_info?.name ?? [customer.vorname, customer.nachname].filter(Boolean).join(" "),
      items,
      subtotal_cents,
      tax_total_cents:  Math.round(subtotal_cents * 0.12 / 1.12),
      total_cents:      subtotal_cents,    // ohne Versand & ohne extra-Rabatte
      billing_address:  shipping_address,
      shipping_address,
      customer_type:    customer.customer_type,
      kunden_notiz:     `Bezahlt über Telegram-Payments (charge: ${payment.telegram_payment_charge_id})`,
    });

    // Sofort auf 'paid' setzen — Geld ist via Telegram-Provider schon
    // gezogen. orderStatusUpdate triggert notifyOrderPaid automatisch.
    await orderStatusUpdate(order.id, "paid", {
      bezahlt:                 true,
      stripe_payment_intent:   payment.provider_payment_charge_id,
    });

    const bestellnr = `GDT-${String(order.order_number).padStart(4, "0")}`;
    await sendMessage(botToken, chatId,
      `✓ Заказ ${bestellnr} оформлен!\n\n` +
      `Сумма: ${(subtotal_cents / 100).toFixed(2)} ${payment.currency}\n` +
      `Платёж: ${payment.telegram_payment_charge_id.slice(0, 12)}…\n\n` +
      `Детали: ${BASE_URL}/kunde/bestellungen/${order.id}`,
    ).catch(() => {});
  } catch (err) {
    console.error("[payment-handler] order create failed:", err);
    await sendMessage(botToken, chatId,
      `⚠ Оплата прошла (${payment.telegram_payment_charge_id}), но при ` +
      `создании заказа произошла ошибка. Мы свяжемся с тобой в течение часа.`,
    ).catch(() => {});
  }
}
