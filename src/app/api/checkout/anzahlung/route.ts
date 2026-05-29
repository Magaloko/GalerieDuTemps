import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { orderById } from "@/lib/db/orders";
import { orderSetPaymentMethod } from "@/lib/db/order-payment";
import { generatePaymentReference } from "@/lib/payment/methods";
import { getMarketingStrings } from "@/lib/db/marketing-strings";

export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * POST /api/checkout/anzahlung   (vor_ort_anzahlung)
 *
 * Самовывоз mit Anzahlung: Kunde reserviert das Stück 7 Tage mit einer
 * Anzahlung (Default ≈30 %, editierbar via Marketing-String
 * `payment.anzahlung.prozent_default`), überweist die Anzahlung per Bank mit
 * der Referenz GDT-XXXX, der Rest wird bei Abholung in der Galerie bezahlt.
 *
 * Provider-frei (wie bank_transfer / vor_ort) — keine Stripe-/Kaspi-Anbindung
 * nötig, Bestätigung läuft manuell über den Admin.
 *
 * Body: { order_id, token? }
 *
 * Lebenszyklus:
 *   1. hier  → payment_method='vor_ort_anzahlung', payment_status='pending',
 *              anzahlung_cents=…, payment_reference=GDT-XXXX,
 *              meta { reserve_bis: +7d, prozent }
 *   2. Admin „Anzahlung erhalten"  → payment_status='partial' (+ anzahlung_bezahlt_am)
 *   3. Admin „Abgeholt & Rest bezahlt" → payment_status='paid', status='paid'
 * ────────────────────────────────────────────────────────────────────────── */

const Body = z.object({ order_id: z.string().uuid(), token: z.string().nullable().optional() });

export async function POST(req: NextRequest) {
  // Schaufenster-Modus: keine Reservierung/Anzahlung (fail-closed).
  const { kaufenGesperrt } = await import("@/lib/db/feature-flags");
  if (await kaufenGesperrt()) {
    return NextResponse.json({ error: "Резервирование временно недоступно." }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validierungsfehler" }, { status: 422 });

  const order = await orderById(parsed.data.order_id);
  if (!order) return NextResponse.json({ error: "Bestellung nicht gefunden" }, { status: 404 });
  if (order.status !== "pending") {
    return NextResponse.json({ error: "Bestellung ist nicht mehr reservierbar" }, { status: 409 });
  }

  const { darfCheckoutBearbeiten } = await import("@/lib/checkout/access");
  if (!(await darfCheckoutBearbeiten(order, { legacyToken: parsed.data.token }))) {
    return NextResponse.json({ error: "Нет доступа к заказу" }, { status: 403 });
  }

  // Vor-Ort-Methoden nur für KZ — Picker filtert schon, hier server-side absichern.
  const land = (order.shipping_address as { land?: string })?.land?.toUpperCase();
  if (land && land !== "KZ") {
    return NextResponse.json({
      error: "Самовывоз доступен только в Казахстане.",
    }, { status: 400 });
  }

  // Anzahlungs-Prozent aus Marketing-String (vom Admin editierbar), Fallback 30 %.
  const ms = await getMarketingStrings(["payment.anzahlung.prozent_default"], "ru").catch(() => ({} as Record<string, string>));
  const prozentRaw = Number.parseInt(ms["payment.anzahlung.prozent_default"] ?? "", 10);
  const prozent = Number.isFinite(prozentRaw) && prozentRaw >= 1 && prozentRaw <= 100 ? prozentRaw : 30;

  const anzahlungCents = Math.max(1, Math.round((order.total_cents * prozent) / 100));
  const reference  = generatePaymentReference(order.order_number);
  const reserveBis = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await orderSetPaymentMethod(parsed.data.order_id, {
    method: "vor_ort_anzahlung",
    status: "pending",
    payment_reference: reference,
    anzahlung_cents: anzahlungCents,
    meta: {
      reserve_bis:  reserveBis.toISOString(),
      anzahlung_prozent: prozent,
      initiated_at: new Date().toISOString(),
    },
  });

  return NextResponse.json({
    ok:              true,
    order_id:        parsed.data.order_id,
    reference,
    anzahlung_cents: anzahlungCents,
    rest_cents:      order.total_cents - anzahlungCents,
    reserve_bis:     reserveBis.toISOString(),
    redirect_to:     `/checkout/zahlung/anzahlung?order=${parsed.data.order_id}`,
  });
}
