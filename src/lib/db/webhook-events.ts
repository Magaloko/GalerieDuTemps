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
    // Zwei-Phasen-Idempotenz: INSERT 'processing'. Bei Konflikt nur dann
    // „reclaimen" (DO UPDATE), wenn das Event NOCH NICHT 'processed' ist —
    // dann gibt RETURNING eine Zeile → Caller verarbeitet (true). Ist es
    // schon 'processed' → WHERE schlägt fehl → keine Zeile → skip (false).
    // Atomar in einem Statement, kein Read-then-Write-Race.
    const r = await query(
      `INSERT INTO sebo.webhook_events (provider, event_id, event_type, payload, status)
       VALUES ($1, $2, $3, $4::jsonb, 'processing')
       ON CONFLICT (provider, event_id) DO UPDATE
         SET status = 'processing'
         WHERE sebo.webhook_events.status <> 'processed'
       RETURNING provider`,
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
 * Markiert ein Event als final verarbeitet (status='processed'). NACH allen
 * Side-Effects (Status-Update, Mail, Coupon) aufrufen. Erst danach gilt ein
 * Provider-Retry als Duplikat und wird übersprungen — vorher (status=
 * 'processing') darf erneut verarbeitet werden (Crash-Recovery).
 */
export async function webhookEventMarkProcessed(
  provider: WebhookProvider,
  eventId:  string,
): Promise<void> {
  await query(
    `UPDATE sebo.webhook_events
       SET status = 'processed', processed_am = now()
     WHERE provider = $1 AND event_id = $2`,
    [provider, eventId],
  ).catch(err => console.warn("[webhookEventMarkProcessed]", err));
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
