import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { getTestPool, setupTestSchema, teardownTestDb, testDbAvailable } from "./test-db";
import { __setPoolForTesting } from "../db";
import { orderErstellen } from "../db/orders";
import { couponErstellen, couponNutzungVerbuchen, couponValidieren } from "../db/coupons";
import type { Address } from "@/types/commerce";

/**
 * Integrationstests für die Coupon-Verbuchung — Geldpfad: kein Doppel-Einlösen
 * (Idempotenz pro Order) und kein Überschreiten von nutzungen_max (Race).
 */

const ADDR: Address = { strasse: "ул. Достык 1", plz: "050000", ort: "Алматы", land: "KZ" };

async function neueOrder(email = "kunde@test.kz"): Promise<string> {
  const o = await orderErstellen({
    customer_email: email, items: [],
    subtotal_cents: 0, tax_total_cents: 0, total_cents: 0,
    billing_address: ADDR, shipping_address: ADDR, customer_type: "b2c",
  });
  return o.id;
}

async function neuerCoupon(code: string, nutzungenMax: number | null): Promise<string> {
  const c = await couponErstellen({
    code, typ: "prozent", wert: 10, nutzungen_max: nutzungenMax,
  });
  return c.id;
}

describe.skipIf(!testDbAvailable())("db/coupons (Integration)", () => {
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
      `TRUNCATE sebo.coupon_nutzungen, sebo.coupons, sebo.order_items, sebo.orders RESTART IDENTITY CASCADE`,
    );
  });

  async function counter(couponId: string): Promise<number> {
    const r = await getTestPool()!.query<{ n: number }>(
      `SELECT nutzungen_aktuell AS n FROM sebo.coupons WHERE id = $1`, [couponId]);
    return r.rows[0].n;
  }

  it("verbucht Nutzung: Counter +1 + Nutzungs-Record", async () => {
    const cid = await neuerCoupon("WELCOME10", null);
    const oid = await neueOrder();

    await couponNutzungVerbuchen({ coupon_id: cid, order_id: oid, customer_email: "kunde@test.kz", rabatt_cents: 1000 });

    expect(await counter(cid)).toBe(1);
    const rows = await getTestPool()!.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM sebo.coupon_nutzungen WHERE coupon_id = $1`, [cid]);
    expect(rows.rows[0].n).toBe(1);
  });

  it("idempotent pro Order: zweite Verbuchung gleicher order_id → kein Doppel-Increment", async () => {
    const cid = await neuerCoupon("WELCOME10", null);
    const oid = await neueOrder();
    const args = { coupon_id: cid, order_id: oid, customer_email: "kunde@test.kz", rabatt_cents: 1000 };

    await couponNutzungVerbuchen(args);
    await couponNutzungVerbuchen(args);   // Retry mit gleicher Order

    expect(await counter(cid)).toBe(1);
  });

  it("Limit-Race: nutzungen_max=1, 2 verschiedene Orders parallel → genau EINE gewinnt", async () => {
    const cid = await neuerCoupon("ONCE", 1);
    const [o1, o2] = await Promise.all([neueOrder("a@test.kz"), neueOrder("b@test.kz")]);

    const ergebnisse = await Promise.allSettled([
      couponNutzungVerbuchen({ coupon_id: cid, order_id: o1, customer_email: "a@test.kz", rabatt_cents: 1000 }),
      couponNutzungVerbuchen({ coupon_id: cid, order_id: o2, customer_email: "b@test.kz", rabatt_cents: 1000 }),
    ]);

    expect(ergebnisse.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(ergebnisse.filter(r => r.status === "rejected")).toHaveLength(1);
    expect(await counter(cid)).toBe(1);
  });

  it("couponValidieren lehnt erschöpften Coupon ab", async () => {
    const cid = await neuerCoupon("ONCE", 1);
    await getTestPool()!.query(`UPDATE sebo.coupons SET nutzungen_aktuell = 1 WHERE id = $1`, [cid]);

    const res = await couponValidieren({ code: "ONCE", subtotal_cents: 100000, customer_type: "b2c" });
    expect(res.ok).toBe(false);
  });
});
