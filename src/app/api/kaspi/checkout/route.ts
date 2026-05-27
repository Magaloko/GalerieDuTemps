import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { orderErstellen } from "@/lib/db/orders";
import { auth } from "@/lib/auth/config";
import { customerById } from "@/lib/db/customers";
import { erstellePaymentLink, kaspiKonfiguriert, getKaspiConfig } from "@/lib/payment/kaspi";
import { berechneCart } from "@/lib/cart";
import { rateLimitPruefen, getClientIp, tooManyRequestsResponse } from "@/lib/utils/rate-limit";
import type { CartItem } from "@/types/commerce";

export const dynamic = "force-dynamic";

const CheckoutSchema = z.object({
  items: z.array(z.object({
    produkt_id: z.string().uuid(),
    menge:      z.number().int().positive().max(99),
  })).min(1).max(50),
  coupon_code:   z.string().optional(),
  customer_phone: z.string().optional(),    // Wenn vorhanden, wird Kaspi-Push gesendet
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimitPruefen(`kaspi-checkout:${ip}`, 10, 10 * 60 * 1000);
  if (!rl.erlaubt) return tooManyRequestsResponse(rl);

  const cfg = await getKaspiConfig();
  if (!kaspiKonfiguriert(cfg)) {
    return NextResponse.json({
      error: "Kaspi не настроен. См. README → KASACHSTAN.md для настройки.",
    }, { status: 503 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 }); }

  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validierungsfehler", details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    // Produkte laden + validieren (analog zu Stripe-Checkout)
    const ids = parsed.data.items.map(i => i.produkt_id);
    const produkteRes = await query<{
      id: string; slug: string; name: string; preis: number;
      lagerbestand: number; verkauft: boolean; b2c_mode: string;
      tax_exempt: boolean; ist_seminar: boolean;
      hauptbild_url: string | null;
    }>(
      `SELECT p.id, p.slug, p.name, p.preis,
              p.lagerbestand, p.verkauft, p.b2c_mode, p.tax_exempt, p.ist_seminar,
              (SELECT pb.url FROM sebo.produktbilder pb
               WHERE pb.produkt_id = p.id AND pb.ist_hauptbild = true LIMIT 1) AS hauptbild_url
       FROM sebo.produkte p
       WHERE p.id = ANY($1::uuid[])`,
      [ids]
    );

    const cartItems: CartItem[] = [];
    for (const reqItem of parsed.data.items) {
      const p = produkteRes.rows.find(r => r.id === reqItem.produkt_id);
      if (!p || p.verkauft || p.b2c_mode === "hidden") {
        return NextResponse.json({ error: "Produkt nicht verfügbar" }, { status: 400 });
      }
      if (reqItem.menge > p.lagerbestand) {
        return NextResponse.json({ error: `Nur ${p.lagerbestand}x verfügbar` }, { status: 400 });
      }
      cartItems.push({
        produkt_id:        p.id,
        slug:              p.slug,
        name:              p.name,
        bild_url:          p.hauptbild_url,
        einzelpreis_cents: Math.round(Number(p.preis) * 100),
        menge:             reqItem.menge,
        tax_rate:          p.tax_exempt ? 0 : 12,    // KZ 12%
        tax_exempt:        p.tax_exempt,
        ist_seminar:       p.ist_seminar,
      });
    }

    const session = await auth();
    let customer_id:    string | undefined;
    let customer_email: string | undefined;
    let customer_name:  string | undefined;
    if (session?.user?.role === "customer") {
      const cust = await customerById(session.user.id);
      if (cust) {
        customer_id    = cust.id;
        customer_email = cust.email;
        customer_name  = [cust.vorname, cust.nachname].filter(Boolean).join(" ");
      }
    }

    const berechnung = berechneCart({ items: cartItems });

    // Order anlegen (Status pending, payment_method='kaspi')
    const order = await orderErstellen({
      customer_id,
      customer_email: customer_email ?? "guest@galeriedutemps.kz",
      customer_name,
      items: cartItems.map(i => ({
        produkt_id:        i.produkt_id,
        produkt_name:      i.name,
        produkt_slug:      i.slug,
        produkt_bild_url:  i.bild_url ?? undefined,
        menge:             i.menge,
        einzelpreis_cents: i.einzelpreis_cents,
        tax_rate:          i.tax_rate,
        tax_amount_cents:  Math.round(i.einzelpreis_cents * i.menge * i.tax_rate / (100 + i.tax_rate)),
        tax_exempt:        i.tax_exempt,
      })),
      subtotal_cents:  berechnung.subtotal_cents,
      tax_total_cents: berechnung.tax_total_cents,
      total_cents:     berechnung.total_cents,
      billing_address: { strasse: "", plz: "", ort: "", land: "KZ" },
      shipping_address: { strasse: "", plz: "", ort: "", land: "KZ" },
      customer_type:   "b2c",
    });

    // Markiere als kaspi-payment
    await query(
      `UPDATE sebo.orders SET payment_method = 'kaspi' WHERE id = $1`,
      [order.id]
    );

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    // Kaspi-Payment erstellen (KZT, ganze Tenge)
    const result = await erstellePaymentLink({
      order_id:        order.id,
      betrag_kzt:      Math.round(berechnung.total_cents / 100),
      beschreibung:    `Galerie du Temps #GDT-${order.order_number}`,
      return_url:      `${baseUrl}/checkout/erfolg/${order.id}`,
      webhook_url:     `${baseUrl}/api/kaspi/webhook`,
      customer_phone:  parsed.data.customer_phone,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.fehler }, { status: 502 });
    }

    // Payment-ID + QR-URL in Order speichern
    await query(
      `UPDATE sebo.orders SET kaspi_payment_id = $1, kaspi_qr_url = $2 WHERE id = $3`,
      [result.payment_id, result.qr_url, order.id]
    );

    return NextResponse.json({
      ok:          true,
      order_id:    order.id,
      payment_id:  result.payment_id,
      qr_url:      result.qr_url,
      pay_url:     result.pay_url,
    });
  } catch (err) {
    console.error("[API Kaspi Checkout]", err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
