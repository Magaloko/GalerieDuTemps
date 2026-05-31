import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { orderErstellen, orderCanceln } from "@/lib/db/orders";
import { couponValidieren } from "@/lib/db/coupons";
import { auth } from "@/lib/auth/config";
import { customerById } from "@/lib/db/customers";
import { erstellePaymentLink, kaspiKonfiguriert, getKaspiConfig } from "@/lib/payment/kaspi";
import { berechneCart } from "@/lib/cart-berechnung";
import { getItemTaxRate } from "@/lib/vat";
import { findeRabattTier } from "@/lib/db/customer-b2b";
import { systemEinstellungenLaden } from "@/lib/db/system-einstellungen";
import { rateLimitPruefen, getClientIp, tooManyRequestsResponse } from "@/lib/utils/rate-limit";
import { getSiteUrl } from "@/lib/site-url";
import type { CartItem } from "@/types/commerce";

export const dynamic = "force-dynamic";

const CheckoutSchema = z.object({
  items: z.array(z.object({
    produkt_id: z.string().uuid(),
    menge:      z.number().int().positive().max(99),
  })).min(1).max(50),
  coupon_code:    z.string().optional(),
  customer_phone: z.string().optional(),    // Wenn vorhanden, wird Kaspi-Push gesendet
});

export async function POST(req: NextRequest) {
  // Schaufenster-Modus: Order-/Payment-Erstellung serverseitig sperren
  // (fail-closed — bei DB-Fehler ebenfalls sperren).
  const { kaufenGesperrt } = await import("@/lib/db/feature-flags");
  if (await kaufenGesperrt()) {
    return NextResponse.json(
      { error: "Покупка временно недоступна — оформите запрос через сайт." },
      { status: 403 },
    );
  }

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

  // Rollback-Anker: Order wird im try angelegt → bei JEDER Exception danach
  // (UPDATE, Payment-Link, …) muss sie storniert werden, sonst Geisterbestellung
  // mit blockiertem (Einzelstück-)Bestand.
  let createdOrderId: string | null = null;
  try {
    // Produkte laden + validieren (analog zu Stripe-Checkout)
    const ids = parsed.data.items.map(i => i.produkt_id);
    const produkteRes = await query<{
      id: string; slug: string; name: string; preis: number;
      b2b_preis_cents: number | null;
      lagerbestand: number; verkauft: boolean; b2c_mode: string;
      tax_exempt: boolean; ist_seminar: boolean;
      hauptbild_url: string | null;
    }>(
      `SELECT p.id, p.slug, p.name, p.preis, p.b2b_preis_cents,
              p.lagerbestand, p.verkauft, p.b2c_mode, p.tax_exempt, p.ist_seminar,
              (SELECT pb.url FROM sebo.produktbilder pb
               WHERE pb.produkt_id = p.id AND pb.ist_hauptbild = true LIMIT 1) AS hauptbild_url
       FROM sebo.produkte p
       WHERE p.id = ANY($1::uuid[])`,
      [ids]
    );

    if (produkteRes.rows.length !== ids.length) {
      return NextResponse.json({ error: "Mindestens ein Produkt existiert nicht" }, { status: 400 });
    }

    // Steuer-Land aus System-Einstellungen (firma_land → "KZ").
    // getItemTaxRate() liefert daraus den korrekten Satz (KZ = 12 % НДС)
    // statt eines hartkodierten Werts. Fix Bug #2.
    const sys = await systemEinstellungenLaden();
    const eigenLand = (sys.firma_land || "KZ").toUpperCase();

    const cartItems: CartItem[] = [];
    for (const reqItem of parsed.data.items) {
      const p = produkteRes.rows.find(r => r.id === reqItem.produkt_id);
      if (!p || p.verkauft || p.b2c_mode === "hidden") {
        return NextResponse.json({ error: "Produkt nicht verfügbar" }, { status: 400 });
      }
      if (reqItem.menge > p.lagerbestand) {
        // Binär — kein exakter Bestand in der Fehlerantwort (Leak-Schutz).
        return NextResponse.json({ error: "Товар недоступен в запрошенном количестве" }, { status: 400 });
      }
      cartItems.push({
        produkt_id:        p.id,
        slug:              p.slug,
        name:              p.name,
        bild_url:          p.hauptbild_url,
        einzelpreis_cents: Math.round(Number(p.preis) * 100),  // wird ggf. durch B2B-Preis ersetzt
        menge:             reqItem.menge,
        // getItemTaxRate statt hart "12" — Bug #2 Fix
        tax_rate:          getItemTaxRate({ tax_exempt: p.tax_exempt, liefer_land: eigenLand, reverse_charge: false }),
        tax_exempt:        p.tax_exempt,
        ist_seminar:       p.ist_seminar,
      });
    }

    // Helper: B2B-Preis-Map für späteren Lookup
    const b2bPreisMap = new Map(produkteRes.rows.map(p => [p.id, p.b2b_preis_cents]));

    // Session laden + customer_type auflösen (Bug #2 Fix: nicht hart "b2c")
    const session = await auth();
    let customer_id:    string | undefined;
    let customer_email: string | undefined;
    let customer_name:  string | undefined;
    let customer_type: "b2c" | "b2b_pending" | "b2b_verified" | "b2b_rejected" = "b2c";

    if (session?.user?.role === "customer") {
      const cust = await customerById(session.user.id);
      if (cust) {
        customer_id    = cust.id;
        customer_email = cust.email ?? undefined;
        customer_name  = [cust.vorname, cust.nachname].filter(Boolean).join(" ");
        customer_type  = cust.customer_type;
      }
    }

    // B2B-Preise anwenden (nur für b2b_verified)
    if (customer_type === "b2b_verified") {
      for (const item of cartItems) {
        const b2b = b2bPreisMap.get(item.produkt_id);
        if (b2b && b2b > 0) {
          item.einzelpreis_cents = b2b;
        }
      }
    }

    // Coupon validieren + Rabatt ermitteln (Bug #1 Fix: war komplett ignoriert)
    let coupon_id:    string | undefined;
    let coupon_code:  string | undefined;
    let rabatt_cents = 0;
    const subtotal_cents = cartItems.reduce((acc, i) => acc + i.einzelpreis_cents * i.menge, 0);

    if (parsed.data.coupon_code) {
      const v = await couponValidieren({
        code:           parsed.data.coupon_code,
        subtotal_cents,
        customer_type,
        customer_email,
      });
      if (v.ok && v.coupon) {
        coupon_id    = v.coupon.id;
        coupon_code  = v.coupon.code;
        rabatt_cents = v.rabatt_cents ?? 0;
      }
    }

    // Rabattstaffel (zusätzlich zum Coupon, für B2B) — analog Stripe-Checkout
    const tier = await findeRabattTier(customer_type, subtotal_cents);
    if (tier) {
      const staffelRabatt = Math.round((subtotal_cents - rabatt_cents) * Number(tier.rabatt_prozent) / 100);
      rabatt_cents += staffelRabatt;
    }

    // Berechnung (mit Rabatt)
    const berechnung = berechneCart({
      items: cartItems,
      rabatt_cents,
      versand_cents: 0,
    });

    // Order anlegen (Status pending, payment_method='kaspi')
    const order = await orderErstellen({
      customer_id,
      customer_email: customer_email ?? "guest@galeriedutemps.kz",
      customer_name,
      // tax_amount_cents aus berechnung.item_details (nach Rabatt-Verteilung),
      // damit Σ(Positions-Steuer) === orders.tax_total_cents. Bug #5 Fix.
      items: cartItems.map((i, idx) => ({
        produkt_id:        i.produkt_id,
        produkt_name:      i.name,
        produkt_slug:      i.slug,
        produkt_bild_url:  i.bild_url ?? undefined,
        menge:             i.menge,
        einzelpreis_cents: i.einzelpreis_cents,
        tax_rate:          i.tax_rate,
        tax_amount_cents:  berechnung.item_details[idx]?.tax_amount_cents ?? 0,
        tax_exempt:        i.tax_exempt,
      })),
      subtotal_cents:  berechnung.subtotal_cents,
      rabatt_cents:    berechnung.rabatt_cents,
      tax_total_cents: berechnung.tax_total_cents,
      total_cents:     berechnung.total_cents,
      billing_address:  { strasse: "", plz: "", ort: "", land: eigenLand },
      shipping_address: { strasse: "", plz: "", ort: "", land: eigenLand },
      customer_type,   // Bug #2 Fix: aus Session statt hart "b2c"
      coupon_id,       // Bug #1 Fix: Coupon wird jetzt persistiert
      coupon_code,
    });

    createdOrderId = order.id;

    // Markiere als kaspi-payment
    await query(
      `UPDATE sebo.orders SET payment_method = 'kaspi' WHERE id = $1`,
      [order.id]
    );

    const baseUrl = getSiteUrl();

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
      // WICHTIG: Die Order wurde oben bereits angelegt → Lagerbestand ist
      // reserviert. Schlägt die Payment-Link-Erstellung fehl (Kaspi-API down,
      // noch nicht implementiert, …), MUSS die Order zurückgerollt werden,
      // sonst bleibt eine bezahlbare-aber-unbezahlte Geisterbestellung mit
      // blockiertem Bestand (bei Einzelstücken: Artikel für alle verschwunden).
      await orderCanceln(order.id, "Kaspi-Payment-Link fehlgeschlagen").catch(e =>
        console.error("[API Kaspi Checkout] Rollback fehlgeschlagen:", e),
      );
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
    // Order wurde evtl. schon angelegt → zurückrollen, sonst bleibt eine
    // unbezahlbare Geisterbestellung mit blockiertem Bestand zurück.
    if (createdOrderId) {
      await orderCanceln(createdOrderId, "Kaspi-Checkout-Ausnahme").catch(e =>
        console.error("[API Kaspi Checkout] Rollback fehlgeschlagen:", e),
      );
    }
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
