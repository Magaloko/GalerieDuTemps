import { query } from "./index";

/* ──────────────────────────────────────────────────────────────────────────
 * Webhook-Idempotenz-Ledger (sebo.webhook_events)
 *
 * Pattern für ALLE Provider-Webhooks (Stripe/Kaspi/Telegram):
 *
 *   const isFresh = await webhookEventReserve("stripe", event.id, event.type, payload);
 *   if (!isFresh) {
 *     // Duplicate-Retry → keine Side-Effects nochmal auslösen
 *     return NextResponse.json({ received: true, duplicate: true });
 *   }
 *   // … Side-Effects (E-Mail, Status-Update, Restock, etc.) …
 *
 * Atomar: INSERT ... ON CONFLICT DO NOTHING. Rowcount=1 → frisch, rowcount=0
 * → war schon da. Race-safe selbst bei zwei parallelen Webhook-Workern.
 *
 * Best-effort orderId-Backfill: wenn beim Initial-Reserve order_id noch
 * unbekannt war (z.B. Stripe-Webhook löst Order-Lookup erst nach Verify aus),
 * kann via webhookEventLinkOrder(...) nachträglich verknüpft werden.
 * ────────────────────────────────────────────────────────────────────────── */

export type WebhookProvider = "stripe" | "kaspi" | "telegram" | "paypal" | "crypto_nowpayments";

/**
 * Reserviert einen Idempotenz-Slot für ein Webhook-Event.
 *
 * @returns `true` wenn das Event ZUM ERSTEN MAL verarbeitet wird (Caller soll
 *          Side-Effects ausführen). `false` wenn das Event bereits verarbeitet
 *          wurde — Caller soll sofort 200 OK zurückgeben ohne Effects.
 */
export async function webhookEventReserve(
  provider:  WebhookProvider,
  eventId:   string,
  eventType: string | null,
  payload:   unknown,
): Promise<boolean> {
  try {
    const r = await query(
      `INSERT INTO sebo.webhook_events (provider, event_id, event_type, payload)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (provider, event_id) DO NOTHING`,
      [provider, eventId, eventType, JSON.stringify(payload ?? {})],
    );
    return (r.rowCount ?? 0) > 0;
  } catch (err) {
    // Bei DB-Ausfall: hart loggen + true zurückgeben damit Caller Effects
    // ausführt. Lieber im seltenen DB-Down-Fall doppelt processen als
    // Zahlung verlieren.
    console.error("[webhookEventReserve] DB-Fehler — fall through:", err);
    return true;
  }
}

/**
 * Optional: nachträglich die order_id zum Event verknüpfen (für Audits).
 */
export async function webhookEventLinkOrder(
  provider: WebhookProvider,
  eventId:  string,
  orderId:  string,
): Promise<void> {
  await query(
    `UPDATE sebo.webhook_events SET order_id = $3
     WHERE provider = $1 AND event_id = $2`,
    [provider, eventId, orderId],
  ).catch(err => console.warn("[webhookEventLinkOrder]", err));
}
