import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { getTestPool, setupTestSchema, teardownTestDb, testDbAvailable } from "./test-db";
import { __setPoolForTesting } from "../db";
import { orderErstellen, orderStatusUpdate } from "../db/orders";
import { orderSetPaymentMethod, orderSetPaymentStatus } from "../db/order-payment";
import type { Address } from "@/types/commerce";

/**
 * Integrationstest für den Anzahlung-Lebenszyklus (vor_ort_anzahlung):
 *   pending (Anzahlung gewählt) → partial (Anzahlung erhalten) → paid (Rest/abgeholt).
 * Prüft, dass payment_status, anzahlung_cents/-bezahlt_am und order.status korrekt
 * durch die echten DB-Funktionen gesetzt werden.
 */

const ADDR: Address = { strasse: "ул. Достык 1", plz: "050000", ort: "Алматы", land: "KZ" };

describe.skipIf(!testDbAvailable())("db/payment-lifecycle Anzahlung (Integration)", () => {
  beforeAll(async () => {
    await setupTestSchema();
    __setPoolForTesting(getTestPool());
  });
  afterAll(async () => {
    __setPoolForTesting(null);
    await teardownTestDb();
  });
  beforeEach(async () => {
    await getTestPool()!.query(
      `TRUNCATE sebo.stock_movements, sebo.order_items, sebo.orders, sebo.produkte RESTART IDENTITY CASCADE`,
    );
  });

  it("Lebenszyklus: pending → partial → paid", async () => {
    const p = getTestPool()!;
    const prod = await p.query<{ id: string }>(
      `INSERT INTO sebo.produkte (name, slug, preis, lagerbestand, aktiv, veroeffentlicht_am)
       VALUES ('Vase', 'vase', 100000, 1, true, now()) RETURNING id`);
    const pid = prod.rows[0].id;

    const order = await orderErstellen({
      customer_email: "kunde@test.kz",
      items: [{ produkt_id: pid, produkt_name: "Vase", menge: 1,
                einzelpreis_cents: 100000, tax_rate: 12, tax_amount_cents: 0, tax_exempt: false }],
      subtotal_cents: 100000, tax_total_cents: 0, total_cents: 100000,
      billing_address: ADDR, shipping_address: ADDR, customer_type: "b2c",
    });

    // 1. Anzahlung gewählt
    await orderSetPaymentMethod(order.id, {
      method: "vor_ort_anzahlung", status: "pending",
      anzahlung_cents: 30000, payment_reference: "GDT-0001",
      meta: { reserve_bis: "2026-01-01T00:00:00.000Z", anzahlung_prozent: 30 },
    });
    let row = (await p.query<{ payment_method: string; payment_status: string; anzahlung_cents: number; anzahlung_bezahlt_am: string | null }>(
      `SELECT payment_method, payment_status, anzahlung_cents, anzahlung_bezahlt_am FROM sebo.orders WHERE id = $1`, [order.id])).rows[0];
    expect(row.payment_method).toBe("vor_ort_anzahlung");
    expect(row.payment_status).toBe("pending");
    expect(row.anzahlung_cents).toBe(30000);
    expect(row.anzahlung_bezahlt_am).toBeNull();

    // 2. Anzahlung erhalten → partial (+ anzahlung_bezahlt_am)
    await orderSetPaymentStatus(order.id, "partial");
    row = (await p.query<{ payment_method: string; payment_status: string; anzahlung_cents: number; anzahlung_bezahlt_am: string | null }>(
      `SELECT payment_method, payment_status, anzahlung_cents, anzahlung_bezahlt_am FROM sebo.orders WHERE id = $1`, [order.id])).rows[0];
    expect(row.payment_status).toBe("partial");
    expect(row.anzahlung_bezahlt_am).not.toBeNull();

    // 3. Abgeholt & Rest bezahlt → status=paid + payment_status=paid + bezahlt_am
    await orderStatusUpdate(order.id, "paid", { bezahlt: true });
    await orderSetPaymentStatus(order.id, "paid");
    const final = (await p.query<{ status: string; payment_status: string; bezahlt_am: string | null }>(
      `SELECT status, payment_status, bezahlt_am FROM sebo.orders WHERE id = $1`, [order.id])).rows[0];
    expect(final.status).toBe("paid");
    expect(final.payment_status).toBe("paid");
    expect(final.bezahlt_am).not.toBeNull();
  });
});
