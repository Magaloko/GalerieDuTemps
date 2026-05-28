import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { orderById } from "@/lib/db/orders";
import { orderSetPaymentMethod } from "@/lib/db/order-payment";
import { getStripeServer, stripeKonfiguriert } from "@/lib/stripe-server";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * POST /api/checkout/stripe
 *
 * Method-Picker-Endpoint für die Karten-Option. Nimmt eine BEREITS ANGELEGTE
 * Order (aus /api/checkout mit picker:true) und erstellt eine Stripe-Hosted-
 * Checkout-Session daraus.
 *
 * Body: { order_id }
 *
 * Response: { checkout_url: 'https://checkout.stripe.com/…' }
 *
 * Der Client redirected dorthin. Bei Success kehrt Stripe via
 * /checkout/erfolg/<id>?session_id=…  zurück, der existing webhook handler
 * setzt payment_status=paid.
 * ────────────────────────────────────────────────────────────────────────── */

const Body = z.object({ order_id: z.string().uuid(), token: z.string().nullable().optional() });

interface OrderItemRow {
  produkt_name:      string;
  produkt_slug:      string;
  produkt_bild_url:  string | null;
  produkt_id:        string;
  einzelpreis_cents: number;
  menge:             number;
}

export async function POST(req: NextRequest) {
  // Schaufenster-Modus: bestehende pending Orders dürfen nicht mehr in eine
  // Stripe-Session überführt werden (fail-closed).
  const { kaufenGesperrt } = await import("@/lib/db/feature-flags");
  if (await kaufenGesperrt()) {
    return NextResponse.json({ error: "Оплата временно недоступна." }, { status: 403 });
  }

  if (!stripeKonfiguriert()) {
    return NextResponse.json({ error: "Stripe не настроен. Обратитесь к администратору." }, { status: 503 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validierungsfehler" }, { status: 422 });

  const order = await orderById(parsed.data.order_id);
  if (!order) return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  if (order.status !== "pending") {
    return NextResponse.json({ error: "Заказ уже оплачен или отменён" }, { status: 409 });
  }
  // IDOR-Schutz: Token oder Customer-Ownership
  const { darfCheckoutBearbeiten } = await import("@/lib/checkout/access");
  if (!(await darfCheckoutBearbeiten(order, { legacyToken: parsed.data.token }))) {
    return NextResponse.json({ error: "Нет доступа к заказу" }, { status: 403 });
  }

  // Order-Items für Line-Items laden (orderById liefert sie bei einigen Code-
  // Pfaden mit, fallback: direkter DB-Query damit wir sicher sind).
  const itemsRes = await query<OrderItemRow>(
    `SELECT produkt_id, produkt_name, produkt_slug, produkt_bild_url,
            einzelpreis_cents, menge
     FROM sebo.order_items
     WHERE order_id = $1`,
    [parsed.data.order_id],
  );
  if (itemsRes.rows.length === 0) {
    return NextResponse.json({ error: "Заказ пустой" }, { status: 400 });
  }

  const stripe = getStripeServer();
  const baseUrl = getSiteUrl();

  try {
    const stripeSession = await stripe.checkout.sessions.create({
      mode:                 "payment",
      payment_method_types: ["card", "paypal", "sepa_debit"],
      line_items: itemsRes.rows.map(i => ({
        price_data: {
          currency:    (order.waehrung ?? "EUR").toLowerCase(),
          unit_amount: i.einzelpreis_cents,
          product_data: {
            name:     i.produkt_name,
            images:   i.produkt_bild_url ? [i.produkt_bild_url] : undefined,
            metadata: { produkt_id: i.produkt_id, slug: i.produkt_slug },
          },
        },
        quantity: i.menge,
      })),
      customer_email: order.customer_email,
      success_url:    `${baseUrl}/checkout/erfolg/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:     `${baseUrl}/checkout/zahlung?order=${order.id}&canceled=true`,
      metadata: {
        order_id:    order.id,
        customer_id: order.customer_id ?? "",
      },
      automatic_tax: { enabled: false },
      locale:        "ru",
    });

    // Stripe-Session-ID + payment_method speichern (für Webhook-Matching).
    await query(
      `UPDATE sebo.orders SET stripe_session_id = $1 WHERE id = $2`,
      [stripeSession.id, order.id],
    );
    await orderSetPaymentMethod(parsed.data.order_id, {
      method: "stripe_card",
      status: "pending",
      meta:   { stripe_session_id: stripeSession.id, initiated_at: new Date().toISOString() },
    });

    return NextResponse.json({
      ok:           true,
      order_id:     order.id,
      checkout_url: stripeSession.url,
    });
  } catch (err) {
    console.error("[API /checkout/stripe]", err);
    const msg = err instanceof Error ? err.message : "Stripe-Fehler";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
