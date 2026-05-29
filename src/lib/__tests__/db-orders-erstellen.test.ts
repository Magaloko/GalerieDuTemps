import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { getTestPool, setupTestSchema, teardownTestDb, testDbAvailable } from "./test-db";
import { __setPoolForTesting } from "../db";
import { orderErstellen } from "../db/orders";
import type { Address } from "@/types/commerce";

/**
 * Integrationstests für die ECHTE orderErstellen()-Funktion (nicht nachgebautes
 * SQL). Deckt den geschäftskritischsten Geldpfad ab: atomare Lager-Reservierung,
 * Oversell-Race bei Unikaten, und Transaktions-Rollback bei Teil-Ausverkauf.
 */

const ADDR: Address = { strasse: "ул. Достык 1", plz: "050000", ort: "Алматы", land: "KZ" };
let seq = 0;

function item(produktId: string | null, name = "Unikat", menge = 1, cents = 100000) {
  return {
    produkt_id: produktId, produkt_name: name, menge,
    einzelpreis_cents: cents, tax_rate: 12, tax_amount_cents: 0, tax_exempt: false,
  };
}

async function neuesProdukt(lager: number, name = "Unikat"): Promise<string> {
  const p = getTestPool()!;
  const r = await p.query<{ id: string }>(
    `INSERT INTO sebo.produkte (name, slug, preis, lagerbestand, aktiv, veroeffentlicht_am)
     VALUES ($1, $2, 100000, $3, true, now()) RETURNING id`,
    [name, `unikat-${++seq}`, lager],
  );
  return r.rows[0].id;
}

const baseOrder = {
  customer_email: "kunde@test.kz",
  subtotal_cents: 100000, tax_total_cents: 0, total_cents: 100000,
  billing_address: ADDR, shipping_address: ADDR, customer_type: "b2c",
};

describe.skipIf(!testDbAvailable())("db/orderErstellen (Integration)", () => {
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

  it("reserviert Lagerbestand atomar + legt stock_movement an", async () => {
    const p = getTestPool()!;
    const pid = await neuesProdukt(1);

    const order = await orderErstellen({ ...baseOrder, items: [item(pid)] });
    expect(order.id).toBeTruthy();
    expect(order.status).toBe("pending");

    const lager = await p.query<{ lagerbestand: number }>(
      `SELECT lagerbestand FROM sebo.produkte WHERE id = $1`, [pid]);
    expect(lager.rows[0].lagerbestand).toBe(0);

    const mv = await p.query<{ typ: string; menge_delta: number }>(
      `SELECT typ, menge_delta FROM sebo.stock_movements WHERE produkt_id = $1`, [pid]);
    expect(mv.rows).toHaveLength(1);
    expect(mv.rows[0].typ).toBe("order_reserve");
    expect(mv.rows[0].menge_delta).toBe(-1);
  });

  it("Oversell-Race: 2 parallele Orders auf lagerbestand=1 → genau EINE gewinnt", async () => {
    const p = getTestPool()!;
    const pid = await neuesProdukt(1);

    const ergebnisse = await Promise.allSettled([
      orderErstellen({ ...baseOrder, items: [item(pid)] }),
      orderErstellen({ ...baseOrder, items: [item(pid)] }),
    ]);

    const erfolg = ergebnisse.filter(r => r.status === "fulfilled").length;
    const fehler = ergebnisse.filter(r => r.status === "rejected").length;
    expect(erfolg).toBe(1);
    expect(fehler).toBe(1);

    const lager = await p.query<{ lagerbestand: number }>(
      `SELECT lagerbestand FROM sebo.produkte WHERE id = $1`, [pid]);
    expect(lager.rows[0].lagerbestand).toBe(0);

    const cnt = await p.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM sebo.orders`);
    expect(cnt.rows[0].n).toBe(1);
  });

  it("Multi-Item, ein Item ausverkauft → komplette Order rollt zurück", async () => {
    const p = getTestPool()!;
    const a = await neuesProdukt(1, "Item A");
    const b = await neuesProdukt(0, "Item B");   // out of stock

    await expect(
      orderErstellen({ ...baseOrder, items: [item(a, "Item A"), item(b, "Item B")] }),
    ).rejects.toThrow();

    // Rollback: A's Bestand wieder 1, keine Order, keine Movements
    const lagerA = await p.query<{ lagerbestand: number }>(
      `SELECT lagerbestand FROM sebo.produkte WHERE id = $1`, [a]);
    expect(lagerA.rows[0].lagerbestand).toBe(1);

    const cnt = await p.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM sebo.orders`);
    expect(cnt.rows[0].n).toBe(0);

    const mv = await p.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM sebo.stock_movements`);
    expect(mv.rows[0].n).toBe(0);
  });
});
