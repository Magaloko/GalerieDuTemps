import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { orderById } from "@/lib/db/orders";
import { orderSetPaymentMethod } from "@/lib/db/order-payment";
import { generatePaymentReference } from "@/lib/payment/methods";

export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * POST /api/checkout/bank-transfer
 *
 * Customer hat im Method-Picker „Banküberweisung" gewählt.
 * Body: { order_id }
 *
 * Schritte:
 *   1. Order laden, prüfen ob 'pending' + 'unpaid'
 *   2. payment_reference generieren (GDT-XXXX, gleich Bestellnummer)
 *   3. payment_method='bank_transfer', payment_status='pending'
 *   4. Response: order_id + reference → Client redirected nach
 *      /checkout/erfolg/<id>?method=bank → zeigt Bank-Daten + Reference
 *
 * Versand erst nach Admin-Bestätigung („Bank-Transfer empfangen"-Button
 * im Admin → setOrderPaymentStatus(paid)).
 * ────────────────────────────────────────────────────────────────────────── */

const Body = z.object({ order_id: z.string().uuid() });

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validierungsfehler" }, { status: 422 });

  const order = await orderById(parsed.data.order_id);
  if (!order) return NextResponse.json({ error: "Bestellung nicht gefunden" }, { status: 404 });
  if (order.status !== "pending") {
    return NextResponse.json({ error: "Bestellung ist nicht mehr zahlbar" }, { status: 409 });
  }

  const reference = generatePaymentReference(order.order_number);
  await orderSetPaymentMethod(parsed.data.order_id, {
    method: "bank_transfer",
    status: "pending",
    payment_reference: reference,
    meta: { initiated_at: new Date().toISOString() },
  });

  // Bestellung soll im Admin sichtbar als "wartet auf Bank-Transfer" sein.
  // Zusätzlich Reference setzen erlaubt späteres CSV-Import-Matching aus
  // dem Bank-Auszug.
  await query(`UPDATE sebo.orders SET kunden_notiz = COALESCE(kunden_notiz || E'\n', '') || $1 WHERE id = $2`,
    [`Bank-Transfer ausgewählt am ${new Date().toISOString()}`, parsed.data.order_id]);

  return NextResponse.json({
    ok:           true,
    order_id:     parsed.data.order_id,
    reference,
    redirect_to:  `/checkout/zahlung/bank?order=${parsed.data.order_id}`,
  });
}
