import { NextResponse } from "next/server";

/* ──────────────────────────────────────────────────────────────────────────
 * POST /api/checkout/paypal  (STUB)
 *
 * Stub damit der Method-Picker bei aktiviertem providerEnvOk('paypal')
 * sofort einen funktionalen Endpoint findet. Volle Implementierung in
 * Iteration 2 (siehe ROADMAP-PAYMENTS.md).
 *
 * Aktivierung:
 *   1. PayPal-Developer-Dashboard → App anlegen → Client-ID + Secret
 *   2. ENV in Coolify:
 *        PAYPAL_CLIENT_ID=...
 *        PAYPAL_SECRET=...
 *        PAYPAL_MODE=live
 *   3. Diesen Stub durch echte PayPal-Order-Creation ersetzen.
 * ────────────────────────────────────────────────────────────────────────── */
export async function POST() {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_SECRET) {
    return NextResponse.json({
      error: "PayPal noch nicht konfiguriert. Admin: PAYPAL_CLIENT_ID + " +
             "PAYPAL_SECRET ENV-Variablen in Coolify setzen.",
    }, { status: 503 });
  }

  // TODO Iteration 2: PayPal REST API
  //   POST https://api.paypal.com/v2/checkout/orders
  //   intent: CAPTURE, purchase_units: [...], return_url: ...
  return NextResponse.json({
    error: "PayPal-Integration noch in Entwicklung.",
  }, { status: 501 });
}
