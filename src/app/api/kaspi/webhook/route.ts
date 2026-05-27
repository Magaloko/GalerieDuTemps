import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { orderStatusUpdate, orderById } from "@/lib/db/orders";
import { orderSetPaymentStatus } from "@/lib/db/order-payment";
import { verifyKaspiWebhook } from "@/lib/payment/kaspi";
import { sendEmail } from "@/lib/email";
import { formatPreis } from "@/lib/utils/preis";

export const dynamic = "force-dynamic";

/**
 * Kaspi.kz Webhook-Empfänger
 * Erwartet POST mit Header X-Kaspi-Signature (HMAC-SHA256)
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-kaspi-signature");
  const body      = await req.text();

  if (!signature || !verifyKaspiWebhook(body, signature)) {
    // Im Stub: warnen aber durchlassen (für Tests)
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    console.warn("[Kaspi Webhook] Signatur-Prüfung übersprungen (DEV)");
  }

  let event: { type: string; data: { payment_id: string; status: string; amount?: number; paid_at?: string; order_id?: string } };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Order via payment_id oder order_id finden.
  // WICHTIG: DB-Lookup-Fehler dürfen NICHT als „Order nicht gefunden"
  // maskiert werden — sonst antwortet die Route mit 200 OK, Kaspi retryt nie,
  // und die Zahlung bleibt für immer im wrong-status.
  const paymentId = event.data.payment_id;
  let r: { rows: { id: string }[] };
  try {
    r = await query<{ id: string }>(
      `SELECT id FROM sebo.orders WHERE kaspi_payment_id = $1 OR id = $2 LIMIT 1`,
      [paymentId, event.data.order_id ?? paymentId],
    );
  } catch (err) {
    console.error("[Kaspi Webhook] DB-Lookup fehlgeschlagen:", err);
    // 500 → Kaspi retryt automatisch
    return NextResponse.json({ error: "DB-Lookup fehlgeschlagen" }, { status: 500 });
  }

  const orderId = r.rows[0]?.id;
  if (!orderId) {
    // Echtes „nicht gefunden" → 200 (kein Retry, fachlich unbekannte payment_id)
    console.warn("[Kaspi Webhook] Order nicht gefunden:", paymentId);
    return NextResponse.json({ ok: true });
  }

  switch (event.type) {
    case "payment.paid":
    case "payment.completed": {
      const existing = await orderById(orderId);
      if (existing?.status === "paid" && existing.payment_status === "paid") {
        break;
      }
      await orderStatusUpdate(orderId, "paid", { bezahlt: true });
      await orderSetPaymentStatus(orderId, "paid", {
        kaspi_payment_id: paymentId,
        kaspi_status:     event.data.status,
        paid_at:          event.data.paid_at ?? new Date().toISOString(),
      });

      // Bestätigungs-Mail (analog zu Stripe-Webhook)
      const full = await orderById(orderId);
      if (full) {
        sendEmail({
          to:      [{ email: full.customer_email, name: full.customer_name ?? "" }],
          subject: `Заказ #GDT-${full.order_number} оплачен`,
          htmlContent: `
            <div style="font-family: Georgia, serif; color: #4A2C1A; padding: 24px;">
              <h2 style="color: #C9A84C;">✦ Спасибо за заказ!</h2>
              <p>Ваш заказ <strong>GDT-${full.order_number}</strong> успешно оплачен через Kaspi.</p>
              <p><strong>Сумма:</strong> ${formatPreis(full.total_cents / 100)}</p>
              <p>Мы свяжемся с вами по поводу доставки.</p>
            </div>
          `,
          tags: ["kaspi-paid"],
        }).catch(err => console.error("[Kaspi Webhook Mail]", err));
      }
      break;
    }

    case "payment.failed":
    case "payment.cancelled":
    case "payment.expired": {
      const { orderCanceln } = await import("@/lib/db/orders");
      await orderSetPaymentStatus(orderId, "failed", {
        kaspi_payment_id: paymentId,
        kaspi_status:     event.data.status,
        failed_event:     event.type,
        failed_at:        new Date().toISOString(),
      });
      await orderCanceln(orderId, `Kaspi: ${event.type}`);
      break;
    }

    default:
      console.log("[Kaspi Webhook] Ignored event:", event.type);
  }

  return NextResponse.json({ ok: true });
}
