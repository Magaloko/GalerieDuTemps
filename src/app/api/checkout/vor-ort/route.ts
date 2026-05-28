import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { orderById } from "@/lib/db/orders";
import { orderSetPaymentMethod } from "@/lib/db/order-payment";
import { generatePaymentReference } from "@/lib/payment/methods";

export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * POST /api/checkout/vor-ort
 *
 * Self-Pickup: keine Anzahlung, Reserve auf 3 Tage. Customer kommt in die
 * Galerie und bezahlt vor Ort.
 *
 * Body: { order_id }
 *
 * Schritte:
 *   1. Order laden + 'pending' Check
 *   2. payment_method='vor_ort', payment_status='unpaid' (bleibt!), Reference
 *   3. Admin sieht im Admin „wartet auf Vor-Ort-Abholung" → kassiert
 *      → setOrderPaymentStatus(paid) → orderStatusUpdate(fulfilled)
 * ────────────────────────────────────────────────────────────────────────── */

const Body = z.object({ order_id: z.string().uuid(), token: z.string().nullable().optional() });

export async function POST(req: NextRequest) {
  // Schaufenster-Modus: keine Vor-Ort-Reservierung mehr (fail-closed).
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

  // Versand-Land sollte KZ sein — wird aber im Method-Picker bereits gefiltert.
  // Falls jemand das umgeht: hier server-side ablehnen.
  const land = (order.shipping_address as { land?: string })?.land?.toUpperCase();
  if (land && land !== "KZ") {
    return NextResponse.json({
      error: "Vor-Ort-Abholung ist nur in Kasachstan verfügbar.",
    }, { status: 400 });
  }

  const reference = generatePaymentReference(order.order_number);
  const reserveBis = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  await orderSetPaymentMethod(parsed.data.order_id, {
    method: "vor_ort",
    status: "unpaid",
    payment_reference: reference,
    meta: {
      reserve_bis: reserveBis.toISOString(),
      initiated_at: new Date().toISOString(),
    },
  });

  return NextResponse.json({
    ok:          true,
    order_id:    parsed.data.order_id,
    reference,
    reserve_bis: reserveBis.toISOString(),
    redirect_to: `/checkout/zahlung/vor-ort?order=${parsed.data.order_id}`,
  });
}
