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
    // FAIL-CLOSED: bei DB-Ausfall NICHT blind fortfahren. Wir werfen →
    // Caller antwortet 503 → Stripe/Kaspi retryen das Event später (Tage).
    // Zahlung geht NICHT verloren UND wird nicht doppelt verarbeitet
    // (keine doppelten Mails / Coupon-Verbuchungen / Status-Updates).
    console.error("[webhookEventReserve] DB-Fehler — fail-closed (503 + Retry):", err);
    throw new WebhookLedgerError(err instanceof Error ? err.message : String(err));
  }
}

/** Idempotenz-Ledger nicht erreichbar → Caller soll 503 + Provider-Retry. */
export class WebhookLedgerError extends Error {
  constructor(msg: string) { super(msg); this.name = "WebhookLedgerError"; }
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
