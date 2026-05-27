import { NextResponse } from "next/server";

/* ──────────────────────────────────────────────────────────────────────────
 * POST /api/checkout/crypto  (STUB · NowPayments)
 *
 * Volle Implementierung in Iteration 2 (siehe ROADMAP-PAYMENTS.md).
 *
 * Aktivierung:
 *   1. NowPayments-Account anlegen (nowpayments.io)
 *   2. API-Key generieren + IPN-Secret setzen
 *   3. ENV in Coolify:
 *        NOWPAYMENTS_API_KEY=...
 *        NOWPAYMENTS_IPN_SECRET=...
 *   4. Webhook-URL bei NowPayments registrieren:
 *        https://galerie.apps.dadakaev.tech/api/checkout/crypto/ipn
 * ────────────────────────────────────────────────────────────────────────── */
export async function POST() {
  if (!process.env.NOWPAYMENTS_API_KEY) {
    return NextResponse.json({
      error: "Crypto-Provider noch nicht konfiguriert. Admin: NOWPAYMENTS_API_KEY " +
             "ENV-Variable in Coolify setzen.",
    }, { status: 503 });
  }

  // TODO Iteration 2: NowPayments REST API
  //   POST https://api.nowpayments.io/v1/invoice
  //   { price_amount, price_currency, pay_currency, order_id, ipn_callback_url }
  //   → { invoice_url } → Client-Redirect dorthin
  return NextResponse.json({
    error: "Crypto-Integration noch in Entwicklung.",
  }, { status: 501 });
}
