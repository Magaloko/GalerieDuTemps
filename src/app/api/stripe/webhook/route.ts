import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeServer, getStripeWebhookSecret } from "@/lib/stripe-server";
import { orderByStripeSession, orderStatusUpdate, orderById } from "@/lib/db/orders";
import { couponNutzungVerbuchen } from "@/lib/db/coupons";
import { sendEmail } from "@/lib/email/brevo";
import { formatPreis } from "@/lib/utils/preis";

export const dynamic = "force-dynamic";

/** Stripe-Webhook für Order-Finalisierung */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Keine Signatur" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripeServer();
    const body   = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, getStripeWebhookSecret());
  } catch (err) {
    console.error("[Stripe Webhook] Signatur ungültig:", err);
    return NextResponse.json({ error: "Ungültige Signatur" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const order   = await orderByStripeSession(session.id);
        if (!order) {
          console.warn("[Webhook] Order nicht gefunden für Session:", session.id);
          break;
        }

        await orderStatusUpdate(order.id, "paid", {
          bezahlt:               true,
          stripe_payment_intent: typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id,
        });

        // Coupon-Nutzung verbuchen
        if (order.coupon_id) {
          await couponNutzungVerbuchen({
            coupon_id:      order.coupon_id,
            order_id:       order.id,
            customer_id:    order.customer_id ?? undefined,
            customer_email: order.customer_email,
            rabatt_cents:   order.rabatt_cents,
          });
        }

        // Bestätigungs-Mail an Kunde
        const full = await orderById(order.id);
        if (full) {
          sendEmail({
            to:      [{ email: full.customer_email, name: full.customer_name ?? "" }],
            subject: `Заказ #GDT-${full.order_number} подтверждён`,
            htmlContent: bestellungBestaetigungMail(full),
            tags:    ["bestellung-bestaetigt"],
          }).catch(err => console.error("[Webhook] Mail-Fehler:", err));
        }
        break;
      }

      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const order   = await orderByStripeSession(session.id);
        if (order && order.status === "pending") {
          const { orderCanceln } = await import("@/lib/db/orders");
          await orderCanceln(order.id, `Stripe: ${event.type}`);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
        if (pi) {
          const { query } = await import("@/lib/db");
          await query(
            `UPDATE sebo.orders SET status = 'refunded' WHERE stripe_payment_intent = $1`,
            [pi]
          );
        }
        break;
      }

      default:
        // Andere Events ignorieren
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Stripe Webhook] Handler-Fehler:", err);
    return NextResponse.json({ error: "Handler-Fehler" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Bestellungs-Bestätigungs-Mail
// ---------------------------------------------------------------------------
function bestellungBestaetigungMail(order: Awaited<ReturnType<typeof orderById>>): string {
  if (!order) return "";
  const items = (order.items ?? []).map(i => `
    <tr>
      <td style="padding: 12px 0; color: #4A2C1A;">${i.menge}× ${i.produkt_name}</td>
      <td style="padding: 12px 0; text-align: right; color: #4A2C1A;">${formatPreis(i.zeile_total_cents / 100)}</td>
    </tr>
  `).join("");

  return `
    <!DOCTYPE html><html lang="de"><body style="font-family: Georgia, serif; background: #F5F0E8; margin: 0; padding: 40px 20px;">
      <div style="max-width: 560px; margin: 0 auto; background: #FDFAF5; border: 1px solid #C9B89A; padding: 48px;">
        <p style="color: #C9A84C; font-size: 20px; text-align: center; margin: 0 0 8px;">✦</p>
        <h1 style="color: #4A2C1A; font-size: 28px; text-align: center; margin: 0 0 16px; font-weight: normal;">
          Bestellung bestätigt
        </h1>
        <p style="color: #4A2C1A; line-height: 1.7;">
          Hallo${order.customer_name ? " " + order.customer_name : ""},<br><br>
          vielen Dank für deine Bestellung bei Galerie du Temps!
        </p>

        <div style="background: #E8DFD0; padding: 16px; margin: 24px 0;">
          <p style="margin: 0; color: #8B6F47; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Bestellnummer</p>
          <p style="margin: 4px 0 0; color: #4A2C1A; font-size: 20px; font-family: monospace;">GDT-${order.order_number}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          ${items}
          <tr style="border-top: 2px solid #C9B89A;">
            <td style="padding: 12px 0; color: #4A2C1A; font-weight: bold;">Gesamtsumme</td>
            <td style="padding: 12px 0; text-align: right; color: #4A2C1A; font-size: 18px;">
              ${formatPreis(order.total_cents / 100)}
            </td>
          </tr>
        </table>

        <p style="color: #8B6F47; line-height: 1.7;">
          Wir bereiten deine Bestellung vor und benachrichtigen dich, sobald sie versandt wurde.
        </p>

        <p style="text-align: center; margin: 32px 0;">
          <a href="${process.env.NEXTAUTH_URL}/kunde/bestellungen/${order.id}"
             style="display: inline-block; padding: 14px 32px; background: #4A2C1A; color: #F5F0E8; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 3px;">
            Bestellung ansehen
          </a>
        </p>
      </div>
    </body></html>
  `.trim();
}

// Stripe verlangt rohen Request-Body — Next.js bodyParser muss aus sein
export const config = { api: { bodyParser: false } };
