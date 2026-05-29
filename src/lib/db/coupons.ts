import { query, withTransaction } from "./index";
import type { Coupon, CouponValidierungsErgebnis, CustomerType } from "@/types/commerce";

/** Coupon per Code */
export async function couponByCode(code: string): Promise<Coupon | null> {
  const r = await query<Coupon>(
    `SELECT * FROM sebo.coupons WHERE code = $1`,
    [code.toUpperCase()]
  );
  return r.rows[0] ?? null;
}

/** Coupon-Validierung gegen Cart + Customer */
export async function couponValidieren(opts: {
  code:           string;
  subtotal_cents: number;
  customer_type:  CustomerType;
  customer_email?: string;
}): Promise<CouponValidierungsErgebnis> {
  const code = opts.code.toUpperCase().trim();
  if (!code) return { ok: false, fehler: "Kein Code angegeben" };

  const coupon = await couponByCode(code);
  if (!coupon)              return { ok: false, fehler: "Code ungültig" };
  if (!coupon.aktiv)        return { ok: false, fehler: "Code nicht aktiv" };

  const jetzt = new Date();
  if (coupon.gueltig_ab && new Date(coupon.gueltig_ab) > jetzt) {
    return { ok: false, fehler: "Code noch nicht gültig" };
  }
  if (coupon.gueltig_bis && new Date(coupon.gueltig_bis) < jetzt) {
    return { ok: false, fehler: "Code abgelaufen" };
  }

  if (coupon.nutzungen_max && coupon.nutzungen_aktuell >= coupon.nutzungen_max) {
    return { ok: false, fehler: "Code maximal ausgenutzt" };
  }

  if (opts.subtotal_cents < coupon.min_bestellwert_cent) {
    const eur = (coupon.min_bestellwert_cent / 100).toFixed(2).replace(".", ",");
    return { ok: false, fehler: `Минимальная сумма заказа ${eur} ₸ не достигнута` };
  }

  if (coupon.nur_b2b && !opts.customer_type.startsWith("b2b")) {
    return { ok: false, fehler: "Code nur für Geschäftskunden" };
  }
  if (coupon.nur_b2c && opts.customer_type !== "b2c") {
    return { ok: false, fehler: "Code nur für Privatkunden" };
  }

  // Per-User-Limit
  if (opts.customer_email && coupon.nutzungen_pro_user > 0) {
    const nutzungenRes = await query<{ anzahl: number }>(
      `SELECT COUNT(*)::int AS anzahl FROM sebo.coupon_nutzungen
       WHERE coupon_id = $1 AND customer_email = $2`,
      [coupon.id, opts.customer_email.toLowerCase()]
    );
    const nutzungen = nutzungenRes.rows[0]?.anzahl ?? 0;
    if (nutzungen >= coupon.nutzungen_pro_user) {
      return { ok: false, fehler: "Du hast diesen Code bereits maximal genutzt" };
    }
  }

  // Rabatt berechnen
  let rabatt_cents = 0;
  if (coupon.typ === "prozent") {
    rabatt_cents = Math.round(opts.subtotal_cents * Number(coupon.wert) / 100);
    if (coupon.max_rabatt_cent && rabatt_cents > coupon.max_rabatt_cent) {
      rabatt_cents = coupon.max_rabatt_cent;
    }
  } else {
    rabatt_cents = Math.round(Number(coupon.wert) * 100);
  }

  // Cap auf Subtotal
  rabatt_cents = Math.min(rabatt_cents, opts.subtotal_cents);

  return { ok: true, coupon, rabatt_cents };
}

/**
 * Coupon-Nutzung verbuchen (nach erfolgreichem Checkout).
 *
 * Race-safe: Counter-Increment + Insert laufen in EINER Transaction, und das
 * Counter-UPDATE prüft das Limit atomar via WHERE-Clause. Wenn zwei Checkouts
 * parallel den Coupon einlösen wollen und nur 1 Nutzung übrig ist, gewinnt
 * exakt einer — der andere wirft einen Error (caller muss das fangen +
 * Order in einen Manual-Review-State setzen statt blind committen).
 *
 * Throws: Error wenn Coupon bereits maximal genutzt (`nutzungen_max` erreicht).
 */
export async function couponNutzungVerbuchen(opts: {
  coupon_id:     string;
  order_id:      string;
  customer_id?:  string;
  customer_email: string;
  rabatt_cents:  number;
}): Promise<void> {
  await withTransaction(async (client) => {
    // 1. IDEMPOTENZ: Nutzungs-Record ZUERST mit ON CONFLICT (order_id) DO NOTHING.
    //    Unique-Index idx_coupon_nutzungen_order (Migration 039) → pro Order
    //    genau eine Verbuchung. Bei Webhook-Retry / Parallel-Retry liefert
    //    RETURNING keine Zeile → wir incrementieren NICHT erneut.
    const insRes = await client.query<{ id: string }>(
      `INSERT INTO sebo.coupon_nutzungen
         (coupon_id, order_id, customer_id, customer_email, rabatt_cents)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (order_id) DO NOTHING
       RETURNING id`,
      [
        opts.coupon_id,
        opts.order_id,
        opts.customer_id ?? null,
        opts.customer_email.toLowerCase(),
        opts.rabatt_cents,
      ],
    );

    // Schon für diese Order verbucht (Retry) → kein zweiter Increment.
    if (insRes.rowCount === 0) return;

    // 2. Erst jetzt atomar incrementieren — nur wenn unter Limit. Bei Limit-
    //    Überschreitung wirft es → ganze Transaction (inkl. Insert) rollt zurück.
    const updateRes = await client.query<{ id: string }>(
      `UPDATE sebo.coupons
          SET nutzungen_aktuell = nutzungen_aktuell + 1
        WHERE id = $1
          AND (nutzungen_max IS NULL OR nutzungen_aktuell < nutzungen_max)
       RETURNING id`,
      [opts.coupon_id],
    );

    if (updateRes.rowCount === 0) {
      throw new Error(
        `Coupon ${opts.coupon_id} bereits maximal genutzt — Race lost. ` +
        `Order ${opts.order_id} sollte als coupon_race_lost markiert werden.`,
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Admin CRUD
// ---------------------------------------------------------------------------
export async function alleCoupons(): Promise<Coupon[]> {
  const r = await query<Coupon>(`SELECT * FROM sebo.coupons ORDER BY erstellt_am DESC`);
  return r.rows;
}

export async function couponErstellen(data: Partial<Coupon> & { code: string; typ: "prozent" | "fest"; wert: number }): Promise<Coupon> {
  const r = await query<Coupon>(
    `INSERT INTO sebo.coupons
       (code, beschreibung, typ, wert, min_bestellwert_cent, max_rabatt_cent,
        nutzungen_max, nutzungen_pro_user, gueltig_ab, gueltig_bis,
        nur_b2b, nur_b2c, nur_neue_kunden)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      data.code.toUpperCase(), data.beschreibung ?? null, data.typ, data.wert,
      data.min_bestellwert_cent ?? 0, data.max_rabatt_cent ?? null,
      data.nutzungen_max ?? null, data.nutzungen_pro_user ?? 1,
      data.gueltig_ab ?? null, data.gueltig_bis ?? null,
      data.nur_b2b ?? false, data.nur_b2c ?? false, data.nur_neue_kunden ?? false,
    ]
  );
  return r.rows[0];
}

export async function couponLoeschen(id: string): Promise<void> {
  await query(`DELETE FROM sebo.coupons WHERE id = $1`, [id]);
}

export async function couponToggleAktiv(id: string, aktiv: boolean): Promise<void> {
  await query(`UPDATE sebo.coupons SET aktiv = $1 WHERE id = $2`, [aktiv, id]);
}
