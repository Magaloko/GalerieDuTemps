import { query } from "./index";
import type { CartItem } from "@/types/commerce";

/* ──────────────────────────────────────────────────────────────────────────
 * Server-Cart — DB-Persistenz für linked Customers.
 *
 * Anonyme User halten Cart in localStorage. Linked Customer-Sessions (Web
 * via NextAuth, Mini-App via webapp-session-Cookie) synchronisieren ihren
 * lokalen Cart-State mit der Server-Tabelle, sodass Cart-Items zwischen
 * Web und Mini-App wandern.
 *
 * Konflikt-Strategy für `cartSpeichern`: REPLACE (kein Merge auf Server-
 * Seite). Der Client entscheidet ob es ein Sync oder ein Merge ist.
 * Begründung: einfacher Mental-Model — „last write wins" mit Debounce
 * im Client, statt komplizierte CRDTs.
 * ────────────────────────────────────────────────────────────────────────── */

export interface ServerCart {
  items:       CartItem[];
  coupon_code: string | null;
  aktualisiert_am: string;
}

/** Cart für Customer laden. null wenn noch kein Cart gespeichert. */
export async function cartLaden(customerId: string): Promise<ServerCart | null> {
  const r = await query<{
    items: CartItem[];
    coupon_code: string | null;
    aktualisiert_am: string;
  }>(
    `SELECT items, coupon_code, aktualisiert_am
     FROM sebo.carts
     WHERE customer_id = $1`,
    [customerId],
  );
  return r.rows[0] ?? null;
}

/** Cart komplett ersetzen (Upsert). */
export async function cartSpeichern(
  customerId: string,
  items: CartItem[],
  couponCode: string | null,
): Promise<void> {
  await query(
    `INSERT INTO sebo.carts (customer_id, items, coupon_code)
     VALUES ($1, $2::jsonb, $3)
     ON CONFLICT (customer_id) DO UPDATE
       SET items       = EXCLUDED.items,
           coupon_code = EXCLUDED.coupon_code`,
    [customerId, JSON.stringify(items), couponCode],
  );
}

/** Cart leeren — nach erfolgreichem Checkout. */
export async function cartLeeren(customerId: string): Promise<void> {
  await query(
    `UPDATE sebo.carts SET items = '[]'::jsonb, coupon_code = NULL
     WHERE customer_id = $1`,
    [customerId],
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Warenkorb-Recovery — verlassene Carts für die Erinnerungs-Push finden.
 * ────────────────────────────────────────────────────────────────────────── */

export interface AbandonedCart {
  customer_id:     string;
  chat_id:         number;
  vorname:         string | null;
  items:           CartItem[];
  aktualisiert_am: string;
}

/**
 * Verlassene Carts mit Telegram-erreichbarem Kunden, die eine Erinnerung
 * verdienen:
 *  - älter als `stundenSchwelle` (keine Aktivität),
 *  - nicht leer,
 *  - noch nicht erinnert seit der letzten Cart-Änderung (Idempotenz),
 *  - Kunde hat Telegram verknüpft + Notifications an,
 *  - KEINE Bestellung seit der letzten Cart-Änderung (→ vermutlich konvertiert,
 *    auch wenn der Client-seitige Cart-Clear nicht lief).
 */
export async function abandonedCarts(
  stundenSchwelle: number,
  limit = 100,
): Promise<AbandonedCart[]> {
  const r = await query<AbandonedCart>(
    `SELECT c.customer_id,
            cu.telegram_chat_id AS chat_id,
            cu.vorname,
            c.items,
            c.aktualisiert_am
       FROM sebo.carts c
       JOIN sebo.customers cu ON cu.id = c.customer_id
      WHERE c.aktualisiert_am < now() - make_interval(hours => $1)
        AND jsonb_array_length(c.items) > 0
        AND (c.erinnert_am IS NULL OR c.erinnert_am < c.aktualisiert_am)
        AND cu.telegram_chat_id IS NOT NULL
        AND cu.telegram_notifications_aktiv = true
        AND NOT EXISTS (
          SELECT 1 FROM sebo.orders o
           WHERE o.customer_id = c.customer_id
             AND o.erstellt_am >= c.aktualisiert_am
        )
      ORDER BY c.aktualisiert_am ASC
      LIMIT $2`,
    [stundenSchwelle, limit],
  );
  return r.rows;
}

/** Erinnerungs-Stempel setzen (nach erfolgreichem Versand). */
export async function cartErinnertMarkieren(customerIds: string[]): Promise<void> {
  if (customerIds.length === 0) return;
  await query(
    `UPDATE sebo.carts SET erinnert_am = now() WHERE customer_id = ANY($1::uuid[])`,
    [customerIds],
  );
}

/**
 * Merge zweier Carts — wird beim Login verwendet wenn Anonymous-User
 * lokale Items hat UND Server bereits Items hat (z.B. von anderem Device).
 *
 * Strategy:
 *  - Gleiche produkt_id → Menge addieren (begrenzt auf max_menge wenn gesetzt)
 *  - Coupon: lokaler gewinnt (User hat ihn gerade eingegeben)
 */
export function mergeCart(local: CartItem[], server: CartItem[]): CartItem[] {
  const merged = new Map<string, CartItem>();
  for (const s of server) {
    merged.set(s.produkt_id, { ...s });
  }
  for (const l of local) {
    const existing = merged.get(l.produkt_id);
    if (existing) {
      const newMenge = existing.menge + l.menge;
      existing.menge = existing.max_menge
        ? Math.min(newMenge, existing.max_menge)
        : newMenge;
    } else {
      merged.set(l.produkt_id, { ...l });
    }
  }
  return Array.from(merged.values());
}
