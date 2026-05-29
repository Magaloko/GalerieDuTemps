import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth/config";
import { query } from "@/lib/db";
import { orderStatusUpdate, orderById, orderCanceln } from "@/lib/db/orders";
import { orderSetPaymentStatus } from "@/lib/db/order-payment";
import { getPaymentStatus } from "@/lib/payment/kaspi";

export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * GET /api/kaspi/status/[id]   ([id] = Order-UUID)
 *
 * Admin-gated Status-Abfrage + Reconcile — Backup für den Webhook (falls der
 * Callback ausbleibt). Liest kaspi_payment_id der Order, fragt den Live-Status
 * bei Kaspi ab und gleicht payment_status/status idempotent an.
 *
 * Antwort: { order_status, payment_status, kaspi: { status, betrag?, bezahlt_am? } | null }
 * ────────────────────────────────────────────────────────────────────────── */

const Params = z.object({ id: z.string().uuid() });

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });

  const parsed = Params.safeParse(await ctx.params);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Order-ID" }, { status: 422 });

  const orderId = parsed.data.id;

  const r = await query<{ kaspi_payment_id: string | null; status: string; payment_status: string | null }>(
    `SELECT kaspi_payment_id, status, payment_status FROM sebo.orders WHERE id = $1`,
    [orderId],
  );
  const row = r.rows[0];
  if (!row) return NextResponse.json({ error: "Bestellung nicht gefunden" }, { status: 404 });

  if (!row.kaspi_payment_id) {
    return NextResponse.json({
      order_status:   row.status,
      payment_status: row.payment_status,
      kaspi:          null,
      hinweis:        "Für diese Bestellung ist keine Kaspi-Zahlung hinterlegt.",
    });
  }

  const kaspi = await getPaymentStatus(row.kaspi_payment_id);
  if (!kaspi) {
    return NextResponse.json({
      order_status:   row.status,
      payment_status: row.payment_status,
      kaspi:          null,
      hinweis:        "Kaspi-Status nicht abrufbar (nicht konfiguriert oder API-Fehler).",
    }, { status: 502 });
  }

  // Idempotenter Reconcile — nur wenn sich etwas ändert.
  if (kaspi.status === "paid" && !(row.status === "paid" && row.payment_status === "paid")) {
    await orderStatusUpdate(orderId, "paid", { bezahlt: true });
    await orderSetPaymentStatus(orderId, "paid", {
      kaspi_payment_id: row.kaspi_payment_id,
      kaspi_status:     "paid",
      reconciled_via:   "status-endpoint",
      paid_at:          kaspi.bezahlt_am ?? new Date().toISOString(),
    });
  } else if (
    (kaspi.status === "failed" || kaspi.status === "expired" || kaspi.status === "cancelled") &&
    row.status !== "cancelled" && row.payment_status !== "paid"
  ) {
    await orderSetPaymentStatus(orderId, "failed", {
      kaspi_payment_id: row.kaspi_payment_id,
      kaspi_status:     kaspi.status,
      reconciled_via:   "status-endpoint",
    });
    await orderCanceln(orderId, `Kaspi: ${kaspi.status}`).catch(() => {});
  }

  const after = await orderById(orderId);
  return NextResponse.json({
    order_status:   after?.status ?? row.status,
    payment_status: after?.payment_status ?? row.payment_status,
    kaspi,
  });
}
