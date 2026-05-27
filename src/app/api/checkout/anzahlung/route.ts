import { NextResponse } from "next/server";

/* ──────────────────────────────────────────────────────────────────────────
 * POST /api/checkout/anzahlung  (STUB · Stripe-Partial)
 *
 * Vor-Ort-Bezahlung mit Online-Anzahlung (typisch 30% der Summe).
 * Volle Implementierung in Iteration 2 (siehe ROADMAP-PAYMENTS.md).
 *
 * Skizze:
 *   1. Anzahlungs-Prozent aus Marketing-String laden
 *   2. anzahlung_cents = total_cents * prozent / 100 (gerundet)
 *   3. Stripe PaymentIntent für anzahlung_cents erstellen
 *   4. orderSetPaymentMethod('vor_ort_anzahlung', status='pending',
 *      anzahlung_cents, reserve_bis=now+7d)
 *   5. Client-Redirect zu /checkout/anzahlung?order=...&client_secret=...
 *      mit Stripe-Elements UI für Karten-Eingabe
 *   6. Webhook payment_intent.succeeded → payment_status='partial'
 *   7. Rest bei Abholung → Admin-Action → payment_status='paid'
 * ────────────────────────────────────────────────────────────────────────── */
export async function POST() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({
      error: "Stripe für Anzahlung-Flow nicht konfiguriert. Admin: " +
             "STRIPE_SECRET_KEY ENV-Variable in Coolify setzen.",
    }, { status: 503 });
  }
  return NextResponse.json({
    error: "Anzahlungs-Flow noch in Entwicklung.",
  }, { status: 501 });
}
