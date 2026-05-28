import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { orderErstellen, orderCanceln } from "@/lib/db/orders";
import { couponValidieren } from "@/lib/db/coupons";
import { customerById } from "@/lib/db/customers";
import { auth } from "@/lib/auth/config";
import { getStripeServer, stripeKonfiguriert } from "@/lib/stripe-server";
import { berechneCart } from "@/lib/cart-berechnung";
import { findeRabattTier } from "@/lib/db/customer-b2b";
import { istReverseCharge } from "@/lib/vat";
import { systemEinstellungenLaden } from "@/lib/db/system-einstellungen";
import { rateLimitAsync, getClientIp, tooManyRequestsResponse } from "@/lib/utils/rate-limit";
import { getSiteUrl } from "@/lib/site-url";
import type { CartItem } from "@/types/commerce";

export const dynamic = "force-dynamic";

const CheckoutSchema = z.object({
  items: z.array(z.object({
    produkt_id: z.string().uuid(),
    menge:      z.number().int().positive().max(99),
  })).min(1).max(50),
  coupon_code: z.string().optional(),
  // Wenn true: Order anlegen, ABER kein Stripe-Session — Client landet im
  // Method-Picker (/checkout/zahlung) und wählt dort. Für Cart-Submit von der
  // Public-Site. Default false (Backwards-Compat für Telegram-Bot etc.).
  picker:      z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  // Schaufenster-Modus: Checkout serverseitig sperren (Defense-in-Depth —
  // UI versteckt den Kauf bereits, aber direkte API-Calls hier abweisen).
  // fail-closed: bei DB-Fehler ebenfalls keine Order erzeugen.
  const { kaufenGesperrt } = await import("@/lib/db/feature-flags");
  if (await kaufenGesperrt()) {
    return NextResponse.json(
      { error: "Покупка временно недоступна — оформите запрос через сайт." },
      { status: 403 },
    );
  }

  // Rate-Limit: 30 Checkouts / 10 Min / IP.
  // Hochgesetzt von 10 — bei mehreren Familienmitgliedern hinter NAT oder
  // beim aktiven Testen wurde die alte Schwelle leicht erreicht. 30 erlaubt
  // normales Browser-/Retry-Verhalten ohne den Spam-Schutz aufzugeben.
  const ip = getClientIp(req);
  const rl = await rateLimitAsync(`checkout:${ip}`, 30, 10 * 60 * 1000);
  if (!rl.erlaubt) {
    return tooManyRequestsResponse(
      rl,
      "Слишком много попыток оформления. Подождите несколько минут и попробуйте снова.",
    );
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 }); }

  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validierungsfehler", details: parsed.error.flatten() }, { status: 422 });
  }

  // Stripe ist nur für den Legacy-Direct-Flow zwingend. Im Picker-Modus
  // wird der Provider erst später im Method-Picker entschieden.
  if (!parsed.data.picker && !stripeKonfiguriert()) {
    return NextResponse.json({
      error: "Stripe ist nicht konfiguriert. Bitte STRIPE_SECRET_KEY in .env.local setzen.",
    }, { status: 503 });
  }

  // Tracker für Rollback: wenn nach dem Order-Insert (Bestand reserviert) noch
  // etwas fehlschlägt (z.B. Stripe-Session-Erstellung), muss die Order storniert
  // + der Bestand freigegeben werden — sonst Geisterbestellung mit Stuck-Stock.
  let createdOrderId: string | null = null;

  try {
    // 1. Produkte aus DB laden + gegen URL-Manipulation validieren
    const ids = parsed.data.items.map(i => i.produkt_id);
    const produkteRes = await query<{
      id: string; slug: string; name: string; preis: number;
      b2b_preis_cents: number | null;
      lagerbestand: number; verkauft: boolean; b2c_mode: string;
      tax_exempt: boolean; ist_seminar: boolean;
      hauptbild_url: string | null;
    }>(
      `SELECT p.id, p.slug, p.name, p.preis, p.b2b_preis_cents,
              p.lagerbestand, p.verkauft, p.b2c_mode,
              p.tax_exempt, p.ist_seminar,
              (SELECT pb.url FROM sebo.produktbilder pb
               WHERE pb.produkt_id = p.id AND pb.ist_hauptbild = true LIMIT 1) AS hauptbild_url
       FROM sebo.produkte p
       WHERE p.id = ANY($1::uuid[])`,
      [ids]
    );

    if (produkteRes.rows.length !== ids.length) {
      return NextResponse.json({ error: "Mindestens ein Produkt existiert nicht" }, { status: 400 });
    }

    // Validierung pro Item
    const cartItems: CartItem[] = [];
    for (const reqItem of parsed.data.items) {
      const p = produkteRes.rows.find(r => r.id === reqItem.produkt_id);
      if (!p) {
        return NextResponse.json({ error: `Produkt ${reqItem.produkt_id} nicht gefunden` }, { status: 400 });
      }
      if (p.verkauft) {
        return NextResponse.json({ error: `"${p.name}" ist nicht mehr verfügbar` }, { status: 400 });
      }
      if (p.b2c_mode === "hidden") {
        return NextResponse.json({ error: "Produkt nicht verfügbar" }, { status: 400 });
      }
      if (p.b2c_mode === "teaser") {
        return NextResponse.json({ error: `"${p.name}" ist nur für verifizierte Studios verfügbar` }, { status: 400 });
      }
      if (reqItem.menge > p.lagerbestand) {
        return NextResponse.json({ error: `Nur ${p.lagerbestand}x "${p.name}" verfügbar` }, { status: 400 });
      }

      cartItems.push({
        produkt_id:        p.id,
        slug:              p.slug,
        name:              p.name,
        bild_url:          p.hauptbild_url,
        einzelpreis_cents: Math.round(Number(p.preis) * 100),  // wird unten ggf. durch B2B-Preis ersetzt
        menge:             reqItem.menge,
        tax_rate:          p.tax_exempt ? 0 : 19,
        tax_exempt:        p.tax_exempt,
        ist_seminar:       p.ist_seminar,
      });
    }

    // Helper: B2B-Preis-Map für späteren Lookup
    const b2bPreisMap = new Map(produkteRes.rows.map(p => [p.id, p.b2b_preis_cents]));

    // 2. Session laden (für Customer)
    const session = await auth();
    let customer_id:    string | undefined;
    let customer_email: string | undefined;
    let customer_name:  string | undefined;
    let customer_type: "b2c" | "b2b_pending" | "b2b_verified" | "b2b_rejected" = "b2c";

    let ust_id: string | undefined;
    if (session?.user?.role === "customer") {
      const cust = await customerById(session.user.id);
      if (cust) {
        customer_id    = cust.id;
        customer_email = cust.email ?? undefined;
        customer_name  = [cust.vorname, cust.nachname].filter(Boolean).join(" ");
        customer_type  = cust.customer_type;
        ust_id         = cust.ust_id ?? undefined;
      }
    }

    // 2b. B2B-Preise anwenden (nur für b2b_verified)
    if (customer_type === "b2b_verified") {
      for (const item of cartItems) {
        const b2b = b2bPreisMap.get(item.produkt_id);
        if (b2b && b2b > 0) {
          item.einzelpreis_cents = b2b;
        }
      }
    }

    // 3. Coupon (falls vorhanden)
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

    // 3b. Rabattstaffel (zusätzlich zum Coupon, für B2B)
    const tier = await findeRabattTier(customer_type, subtotal_cents);
    if (tier) {
      const staffelRabatt = Math.round((subtotal_cents - rabatt_cents) * Number(tier.rabatt_prozent) / 100);
      rabatt_cents += staffelRabatt;
    }

    // 3c. Reverse-Charge für B2B mit UID + Lieferland ≠ DE
    //     (Lieferland wird im Stripe-Checkout abgefragt; hier vorbereiten — finale Anpassung im Webhook)
    const sys = await systemEinstellungenLaden();
    const eigenLand = (sys.firma_land || "DE").toUpperCase();
    // Wir setzen reverse_charge initial false — bei verifiziertem B2B mit UID + nicht-Inland aktivieren wir
    // den Tax-Rate-Override (Stripe shipping_address_collection liefert dann das Land im Webhook)
    let reverse_charge = false;
    if (customer_type === "b2b_verified" && ust_id) {
      // Wenn Lieferland im Cart noch unbekannt: wir markieren das Order-Feld;
      // wenn der Webhook das Lieferland kennt und es ≠ eigen_land, wird der Status final.
      // Für die initiale Berechnung nutzen wir den User-Default (Billing-Country falls vorhanden)
      reverse_charge = istReverseCharge({
        customer_type,
        ust_id,
        liefer_land: eigenLand,    // optimistisch: noch nicht entschieden
        eigen_land:  eigenLand,
      });
    }

    // Bei aktivem Reverse-Charge → tax_rate aller Items auf 0
    if (reverse_charge) {
      for (const item of cartItems) {
        item.tax_rate = 0;
      }
    }

    // 4. Berechnung
    const berechnung = berechneCart({
      items: cartItems,
      rabatt_cents,
      versand_cents: 0,
    });

    // 5. Order anlegen (Status 'pending')
    const order = await orderErstellen({
      customer_id,
      customer_email: customer_email ?? "gast@galeriedutemps.kz",
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
      rabatt_cents:    berechnung.rabatt_cents,
      tax_total_cents: berechnung.tax_total_cents,
      total_cents:     berechnung.total_cents,
      // Default-Lieferland kommt aus System-Einstellungen (firma_land). KZ-Shop
      // → 'KZ' → Vor-Ort/Vor-Ort-Anzahlung erscheinen im Method-Picker.
      // Bei Stripe-Checkout wird das Lieferland später überschrieben durch
      // shipping_address_collection.
      billing_address:  { strasse: "", plz: "", ort: "", land: eigenLand },
      shipping_address: { strasse: "", plz: "", ort: "", land: eigenLand },
      customer_type,
      reverse_charge,
      ust_id,
      coupon_id,
      coupon_code,
    });
    createdOrderId = order.id;  // ab hier ist Bestand reserviert → Rollback nötig bei Fehler

    // 5a. Critical-Alert: große Bestellung → Admins via Telegram pushen.
    // Schwelle ₸500 000 (= 50 000 000 cents). Best-effort, non-blocking.
    if (berechnung.total_cents >= 500_000_00) {
      void import("@/lib/notifications/admin-telegram").then(({ notifyAdminsCritical }) =>
        notifyAdminsCritical(
          "large_order",
          `Заказ <b>GDT-${order.order_number}</b>\n` +
          `Сумма: <b>${(berechnung.total_cents / 100).toLocaleString("ru-RU")} ₸</b>\n` +
          `Клиент: ${customer_name ?? customer_email ?? "гость"}`,
          `/admin/bestellungen/${order.id}`,
        ),
      ).catch(err => console.error("[large_order alert]", err));
    }

    // 5b. Picker-Modus: Order ist angelegt, Provider-Wahl im Method-Picker.
    //     IDOR-Schutz via HttpOnly-Cookie (kein Token in der URL → kein Leak
    //     über History/Referer/Logs). Cookie wird von Checkout-Seiten +
    //     Zahlungs-Routen geprüft (darfCheckoutBearbeiten).
    if (parsed.data.picker) {
      if (order.checkout_token) {
        const { setCheckoutAccessCookie } = await import("@/lib/checkout/access");
        await setCheckoutAccessCookie(order.id, order.checkout_token);
      }
      return NextResponse.json({
        ok:          true,
        order_id:    order.id,
        redirect_to: `/checkout/zahlung?order=${order.id}`,
      });
    }

    // 6. Stripe-Checkout-Session erstellen (Legacy-Direct-Flow für Telegram-Bot etc.)
    const stripe = getStripeServer();
    const baseUrl = getSiteUrl();

    const stripeSession = await stripe.checkout.sessions.create({
      mode:               "payment",
      payment_method_types: ["card", "paypal", "sepa_debit"],
      line_items: cartItems.map(i => ({
        price_data: {
          currency:     "eur",
          unit_amount:  i.einzelpreis_cents,
          product_data: {
            name:        i.name,
            images:      i.bild_url ? [i.bild_url] : undefined,
            metadata:    { produkt_id: i.produkt_id, slug: i.slug },
          },
        },
        quantity: i.menge,
      })),
      ...(rabatt_cents > 0 && coupon_code ? {
        discounts: [{ coupon: await getOrCreateStripeCoupon(stripe, coupon_code, rabatt_cents) }],
      } : {}),
      customer_email: customer_email,
      success_url:    `${baseUrl}/checkout/erfolg/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:     `${baseUrl}/warenkorb?canceled=true`,
      metadata: {
        order_id:    order.id,
        customer_id: customer_id ?? "",
      },
      shipping_address_collection: {
        allowed_countries: ["DE", "AT", "CH", "NL", "BE", "FR", "IT", "ES", "PL"],
      },
      automatic_tax: { enabled: false },
      locale: "de",
    });

    // 7. Stripe-Session-ID in Order speichern
    await query(
      `UPDATE sebo.orders SET stripe_session_id = $1 WHERE id = $2`,
      [stripeSession.id, order.id]
    );

    return NextResponse.json({
      ok:           true,
      checkout_url: stripeSession.url,
      order_id:     order.id,
    });
  } catch (err) {
    console.error("[API /checkout]", err);
    // Rollback: wurde die Order schon angelegt (Bestand reserviert), aber danach
    // ist etwas fehlgeschlagen (z.B. Stripe-Session) → stornieren + Bestand frei.
    if (createdOrderId) {
      await orderCanceln(createdOrderId, "Checkout abgebrochen (Fehler nach Order-Anlage)")
        .catch(e => console.error("[API /checkout] Rollback fehlgeschlagen:", e));
    }
    const msg = err instanceof Error ? err.message : "Checkout-Fehler";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Helper: Stripe-Coupon on-the-fly erstellen (für Discount)
// ---------------------------------------------------------------------------
async function getOrCreateStripeCoupon(
  stripe: ReturnType<typeof getStripeServer>,
  code: string,
  rabattCents: number
): Promise<string> {
  // Einmal-Coupon, läuft nach 1 Tag ab — perfekt für Session
  const coupon = await stripe.coupons.create({
    name:        `Code ${code}`,
    amount_off:  rabattCents,
    currency:    "eur",
    duration:    "once",
    redeem_by:   Math.floor(Date.now() / 1000) + 86400,
  });
  return coupon.id;
}
