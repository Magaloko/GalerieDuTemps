import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { getTestPool, setupTestSchema, teardownTestDb, testDbAvailable } from "./test-db";
import { __setPoolForTesting } from "../db";
import {
  webhookEventReserve, webhookEventMarkProcessed, webhookEventLinkOrder,
} from "../db/webhook-events";
import { orderErstellen } from "../db/orders";
import type { Address } from "@/types/commerce";

/**
 * Integrationstests für das Webhook-Idempotenz-Ledger — verhindert doppelte
 * Verarbeitung (doppelte Mails / Coupon-Verbuchung / Status-Updates) bei
 * Provider-Retries (Stripe/Kaspi/Telegram).
 */

const ADDR: Address = { strasse: "ул. Достык 1", plz: "050000", ort: "Алматы", land: "KZ" };

describe.skipIf(!testDbAvailable())("db/webhook-events Idempotenz (Integration)", () => {
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
      `TRUNCATE sebo.webhook_events, sebo.order_items, sebo.orders RESTART IDENTITY CASCADE`,
    );
  });

  it("frisches Event → true (Caller verarbeitet)", async () => {
    const fresh = await webhookEventReserve("stripe", "evt_1", "checkout.session.completed", { a: 1 });
    expect(fresh).toBe(true);
  });

  it("'processing'-Event erneut → true (Reclaim für Crash-Recovery)", async () => {
    await webhookEventReserve("stripe", "evt_2", "type", {});
    // Noch nicht markProcessed → Reclaim erlaubt
    const again = await webhookEventReserve("stripe", "evt_2", "type", {});
    expect(again).toBe(true);
  });

  it("nach markProcessed → Duplikat wird übersprungen (false)", async () => {
    await webhookEventReserve("kaspi", "evt_3", "payment.paid", {});
    await webhookEventMarkProcessed("kaspi", "evt_3");

    const duplicate = await webhookEventReserve("kaspi", "evt_3", "payment.paid", {});
    expect(duplicate).toBe(false);
  });

  it("gleiche event_id bei verschiedenen Providern kollidiert NICHT", async () => {
    await webhookEventReserve("stripe", "shared_id", "t", {});
    await webhookEventMarkProcessed("stripe", "shared_id");

    // Anderer Provider, gleiche ID → eigener Slot → frisch
    const kaspi = await webhookEventReserve("kaspi", "shared_id", "t", {});
    expect(kaspi).toBe(true);
  });

  it("linkOrder backfillt order_id", async () => {
    const order = await orderErstellen({
      customer_email: "kunde@test.kz", items: [],
      subtotal_cents: 0, tax_total_cents: 0, total_cents: 0,
      billing_address: ADDR, shipping_address: ADDR, customer_type: "b2c",
    });
    await webhookEventReserve("stripe", "evt_link", "t", {});
    await webhookEventLinkOrder("stripe", "evt_link", order.id);

    const r = await getTestPool()!.query<{ order_id: string | null }>(
      `SELECT order_id FROM sebo.webhook_events WHERE provider = 'stripe' AND event_id = 'evt_link'`);
    expect(r.rows[0].order_id).toBe(order.id);
  });
});
