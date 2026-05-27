import { query, withTransaction } from "./index";
import type { Order, OrderItem, OrderStatus, Address } from "@/types/commerce";

// ---------------------------------------------------------------------------
// Order erstellen (transaktional + Stock-Movements)
// ---------------------------------------------------------------------------
export async function orderErstellen(data: {
  customer_id?:    string;
  customer_email:  string;
  customer_name?:  string;
  items: Array<{
    produkt_id:        string | null;
    produkt_name:      string;
    produkt_slug?:     string;
    produkt_bild_url?: string;
    menge:             number;
    einzelpreis_cents: number;
    rabatt_cents?:     number;
    tax_rate:          number;
    tax_amount_cents:  number;
    tax_exempt:        boolean;
  }>;
  subtotal_cents:   number;
  rabatt_cents?:    number;
  versand_cents?:   number;
  tax_total_cents:  number;
  total_cents:      number;
  billing_address:  Address;
  shipping_address: Address;
  versandart?:      string;
  coupon_id?:       string;
  coupon_code?:     string;
  customer_type:    string;
  reverse_charge?:  boolean;
  ust_id?:          string;
  kunden_notiz?:    string;
  stripe_session_id?: string;
}): Promise<Order> {
  return withTransaction(async (client) => {
    // Order erstellen
    const orderRes = await client.query<Order>(
      `INSERT INTO sebo.orders
         (customer_id, customer_email, customer_name, status,
          subtotal_cents, rabatt_cents, versand_cents, tax_total_cents, total_cents,
          billing_address, shipping_address, versandart,
          coupon_id, coupon_code_snapshot,
          customer_type_snapshot, reverse_charge, ust_id_snapshot,
          kunden_notiz, stripe_session_id)
       VALUES ($1,$2,$3,'pending',
               $4,$5,$6,$7,$8,
               $9::jsonb,$10::jsonb,$11,
               $12,$13,
               $14,$15,$16,
               $17,$18)
       RETURNING *`,
      [
        data.customer_id ?? null,
        data.customer_email.toLowerCase(),
        data.customer_name ?? null,
        data.subtotal_cents,
        data.rabatt_cents ?? 0,
        data.versand_cents ?? 0,
        data.tax_total_cents,
        data.total_cents,
        JSON.stringify(data.billing_address),
        JSON.stringify(data.shipping_address),
        data.versandart ?? "standard",
        data.coupon_id ?? null,
        data.coupon_code ?? null,
        data.customer_type,
        data.reverse_charge ?? false,
        data.ust_id ?? null,
        data.kunden_notiz ?? null,
        data.stripe_session_id ?? null,
      ]
    );
    const order = orderRes.rows[0];

    // Items + Lager-Reservierung
    for (const item of data.items) {
      const zeile_total = item.einzelpreis_cents * item.menge - (item.rabatt_cents ?? 0);

      await client.query(
        `INSERT INTO sebo.order_items
           (order_id, produkt_id, produkt_name, produkt_slug, produkt_bild_url,
            menge, einzelpreis_cents, rabatt_cents,
            tax_rate, tax_amount_cents, tax_exempt, zeile_total_cents)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          order.id, item.produkt_id, item.produkt_name,
          item.produkt_slug ?? null, item.produkt_bild_url ?? null,
          item.menge, item.einzelpreis_cents, item.rabatt_cents ?? 0,
          item.tax_rate, item.tax_amount_cents, item.tax_exempt, zeile_total,
        ]
      );

      // Lager reservieren
      if (item.produkt_id) {
        const reserveRes = await client.query(
          `UPDATE sebo.produkte
           SET lagerbestand = lagerbestand - $1
           WHERE id = $2
             AND lagerbestand >= $1
             AND verkauft = false`,
          [item.menge, item.produkt_id]
        );
        if ((reserveRes.rowCount ?? 0) === 0) {
          throw new Error(`Nicht genug Lagerbestand für "${item.produkt_name}"`);
        }
        await client.query(
          `INSERT INTO sebo.stock_movements (produkt_id, typ, menge_delta, order_id)
           VALUES ($1, 'order_reserve', $2, $3)`,
          [item.produkt_id, -item.menge, order.id]
        );
      }
    }

    // Telegram-Notification: fire-and-forget AUSSERHALB der Transaction,
    // damit der Order-Insert nicht von einer Telegram-API-Latenz blockiert
    // wird. Dynamischer Import um zirkuläre Abhängigkeiten zu vermeiden.
    if (order.customer_id) {
      import("@/lib/notifications/customer-telegram")
        .then(m => m.notifyOrderPlaced(order.id))
        .catch(err => console.warn("[order-notify-placed]", err));
    }

    return order;
  });
}

/** Order per ID (inkl. items) */
export async function orderById(id: string): Promise<Order | null> {
  const orderRes = await query<Order>(`SELECT * FROM sebo.orders WHERE id = $1`, [id]);
  if (!orderRes.rows[0]) return null;
  const itemsRes = await query<OrderItem>(
    `SELECT * FROM sebo.order_items WHERE order_id = $1 ORDER BY erstellt_am`,
    [id]
  );
  return { ...orderRes.rows[0], items: itemsRes.rows };
}

/** Order per Stripe-Session */
export async function orderByStripeSession(sessionId: string): Promise<Order | null> {
  const r = await query<Order>(
    `SELECT * FROM sebo.orders WHERE stripe_session_id = $1`,
    [sessionId]
  );
  return r.rows[0] ?? null;
}

/** Status-Update */
export async function orderStatusUpdate(
  id: string,
  status: OrderStatus,
  extra?: { stripe_payment_intent?: string; bezahlt?: boolean; tracking?: { nummer: string; url?: string } }
): Promise<void> {
  const felder: string[] = ["status = $1"];
  const werte:  unknown[] = [status];
  let idx = 2;

  if (extra?.stripe_payment_intent) {
    felder.push(`stripe_payment_intent = $${idx++}`);
    werte.push(extra.stripe_payment_intent);
  }
  if (extra?.bezahlt) {
    felder.push(`bezahlt_am = now()`);
  }
  if (extra?.tracking) {
    felder.push(`tracking_nummer = $${idx++}`, `tracking_url = $${idx++}`, `versendet_am = now()`);
    werte.push(extra.tracking.nummer, extra.tracking.url ?? null);
  }

  werte.push(id);
  await query(
    `UPDATE sebo.orders SET ${felder.join(", ")} WHERE id = $${idx}`,
    werte
  );

  // Telegram-Notification je nach Status. Async — kein await, damit
  // Admin-UI nicht auf Telegram-API wartet.
  void notifyOrderStatusChange(id, status, extra?.tracking);
}

/** Interner Helper: passende Notification je Status-Übergang triggern. */
async function notifyOrderStatusChange(
  orderId: string,
  status:  OrderStatus,
  tracking?: { nummer: string; url?: string },
): Promise<void> {
  try {
    const mod = await import("@/lib/notifications/customer-telegram");
    if (status === "paid")        return mod.notifyOrderPaid(orderId);
    if (status === "fulfilled")   return mod.notifyOrderShipped(orderId, tracking);
    if (status === "cancelled")   return mod.notifyOrderCancelled(orderId);
    // 'pending' / 'completed' / 'refunded' bewusst ohne Push
  } catch (err) {
    console.warn("[order-notify-status]", err);
  }
}

/** Notizen aktualisieren (intern + Kunde) */
export async function orderNotizenAktualisieren(
  id: string,
  interne_notiz: string | null,
  kunden_notiz:  string | null
): Promise<void> {
  await query(
    `UPDATE sebo.orders
     SET interne_notiz = $1, kunden_notiz = $2, aktualisiert_am = now()
     WHERE id = $3`,
    [interne_notiz, kunden_notiz, id]
  );
}

/** Tracking aktualisieren (ohne Status-Wechsel) */
export async function orderTrackingAktualisieren(
  id: string,
  tracking_nummer: string | null,
  tracking_url:    string | null
): Promise<void> {
  await query(
    `UPDATE sebo.orders
     SET tracking_nummer = $1,
         tracking_url    = $2,
         versendet_am    = COALESCE(versendet_am, CASE WHEN $1 IS NOT NULL THEN now() END),
         aktualisiert_am = now()
     WHERE id = $3`,
    [tracking_nummer, tracking_url, id]
  );
}

/** Order canceln + Lager zurückgeben */
export async function orderCanceln(id: string, grund: string): Promise<void> {
  await withTransaction(async (client) => {
    // Items für Restock
    const itemsRes = await client.query<{ produkt_id: string | null; menge: number }>(
      `SELECT produkt_id, menge FROM sebo.order_items WHERE order_id = $1`,
      [id]
    );

    for (const item of itemsRes.rows) {
      if (item.produkt_id) {
        await client.query(
          `UPDATE sebo.produkte SET lagerbestand = lagerbestand + $1 WHERE id = $2`,
          [item.menge, item.produkt_id]
        );
        await client.query(
          `INSERT INTO sebo.stock_movements (produkt_id, typ, menge_delta, order_id, notiz)
           VALUES ($1, 'order_release', $2, $3, $4)`,
          [item.produkt_id, item.menge, id, grund]
        );
      }
    }

    await client.query(
      `UPDATE sebo.orders
       SET status = 'cancelled', storniert_am = now(), storniert_grund = $1
       WHERE id = $2`,
      [grund, id]
    );
  });
}

// ---------------------------------------------------------------------------
// Listen-Queries
// ---------------------------------------------------------------------------
export interface PaginierteOrders {
  items:  Order[];
  gesamt: number;
  seite:  number;
  seiten: number;
}

export async function ordersListe(params: {
  seite?:        number;
  limit?:        number;
  status?:       OrderStatus | "";
  customer_id?:  string;
  suche?:        string;
}): Promise<PaginierteOrders> {
  const seite  = Math.max(1, params.seite ?? 1);
  const limit  = Math.min(100, params.limit ?? 20);
  const offset = (seite - 1) * limit;

  const conds: string[] = [];
  const vals:  unknown[] = [];
  let idx = 1;

  if (params.status) {
    conds.push(`status = $${idx++}`);
    vals.push(params.status);
  }
  if (params.customer_id) {
    conds.push(`customer_id = $${idx++}`);
    vals.push(params.customer_id);
  }
  if (params.suche) {
    conds.push(`(customer_email ILIKE $${idx} OR customer_name ILIKE $${idx} OR order_number::text ILIKE $${idx})`);
    vals.push(`%${params.suche}%`);
    idx++;
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const [c, d] = await Promise.all([
    query<{ gesamt: number }>(`SELECT COUNT(*)::int AS gesamt FROM sebo.orders ${where}`, vals),
    query<Order>(
      `SELECT * FROM sebo.orders ${where} ORDER BY erstellt_am DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...vals, limit, offset]
    ),
  ]);
  const gesamt = c.rows[0]?.gesamt ?? 0;
  return { items: d.rows, gesamt, seite, seiten: Math.ceil(gesamt / limit) };
}

/** Eigene Orders eines Customers */
export async function ordersFuerCustomer(customerId: string): Promise<Order[]> {
  const r = await query<Order>(
    `SELECT * FROM sebo.orders WHERE customer_id = $1 ORDER BY erstellt_am DESC`,
    [customerId]
  );
  return r.rows;
}

// ---------------------------------------------------------------------------
// Cron: abgelaufene pending-Orders canceln
// ---------------------------------------------------------------------------
export async function staleOrdersCanceln(maxAlterStunden = 24): Promise<number> {
  const orders = await query<{ id: string }>(
    `SELECT id FROM sebo.orders
     WHERE status = 'pending'
       AND erstellt_am < now() - ($1 || ' hours')::interval`,
    [maxAlterStunden]
  );
  for (const row of orders.rows) {
    await orderCanceln(row.id, "Automatisch storniert: Zahlung nicht abgeschlossen");
  }
  return orders.rowCount ?? 0;
}
