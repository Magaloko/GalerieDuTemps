import { query } from "./index";
import type { PaymentMethod, PaymentStatus } from "@/types/commerce";

/* ──────────────────────────────────────────────────────────────────────────
 * Order-Payment-Helper
 *
 * Trennt Payment-Updates von order.status-Updates (orders.ts), weil die
 * beiden separate Lifecycles haben:
 *
 *   order.status   — pending → paid → fulfilled → completed
 *   payment_status — unpaid → pending → (partial) → paid
 *
 * Beispiel Anzahlung-Flow:
 *   1. orderErstellen → status=pending, payment_status=unpaid, payment_method='vor_ort_anzahlung', anzahlung_cents=30000
 *   2. Customer bezahlt 30000 ¢ online (Stripe) → setOrderPaymentStatus(paid_partial)
 *      payment_status=partial, anzahlung_bezahlt_am=now()
 *   3. Customer holt ab + zahlt Rest → Admin: setOrderPaymentStatus(paid_full)
 *      payment_status=paid, status=paid (Order kann jetzt fulfilled werden)
 * ────────────────────────────────────────────────────────────────────────── */

export interface SetMethodArgs {
  method:           PaymentMethod;
  status?:          PaymentStatus;
  meta?:            Record<string, unknown>;
  anzahlung_cents?: number | null;
  payment_reference?: string;
}

/** Setzt initial die gewählte Methode + ggf. Reference (für Bank/Vor-Ort). */
export async function orderSetPaymentMethod(orderId: string, args: SetMethodArgs): Promise<void> {
  await query(
    `UPDATE sebo.orders
       SET payment_method     = $1,
           payment_status     = COALESCE($2, payment_status),
           payment_meta       = sebo.orders.payment_meta || COALESCE($3::jsonb, '{}'::jsonb),
           anzahlung_cents    = $4,
           payment_reference  = COALESCE($5, payment_reference)
     WHERE id = $6`,
    [
      args.method,
      args.status ?? null,
      args.meta ? JSON.stringify(args.meta) : null,
      args.anzahlung_cents ?? null,
      args.payment_reference ?? null,
      orderId,
    ],
  );
}

/** Update nur payment_status (z.B. nach Webhook). */
export async function orderSetPaymentStatus(
  orderId: string,
  status: PaymentStatus,
  metaPatch?: Record<string, unknown>,
): Promise<void> {
  await query(
    `UPDATE sebo.orders
       SET payment_status = $1,
           payment_meta   = sebo.orders.payment_meta || COALESCE($2::jsonb, '{}'::jsonb),
           anzahlung_bezahlt_am = CASE
             WHEN $1 = 'partial' AND sebo.orders.anzahlung_bezahlt_am IS NULL THEN now()
             ELSE sebo.orders.anzahlung_bezahlt_am
           END
     WHERE id = $3`,
    [status, metaPatch ? JSON.stringify(metaPatch) : null, orderId],
  );
}

/** Lookup nach Payment-Reference (für Admin „Banküberweisung erhalten"-Flow). */
export async function orderByPaymentReference(reference: string): Promise<{ id: string; order_number: number; total_cents: number; payment_status: PaymentStatus } | null> {
  const r = await query<{
    id: string;
    order_number: number;
    total_cents: number;
    payment_status: PaymentStatus;
  }>(
    `SELECT id, order_number, total_cents, payment_status
     FROM sebo.orders
     WHERE payment_reference = $1
     LIMIT 1`,
    [reference],
  );
  return r.rows[0] ?? null;
}
