import type { OrderStatus } from "@/types/commerce";

/* ──────────────────────────────────────────────────────────────────────────
 * Zentrale Order-Status-Darstellung (RU-Label + Farb-Token).
 *
 * Single source of truth — vorher war diese Map 4× dupliziert mit
 * divergierenden Labels (z.B. fulfilled = „Отправлен" vs „Выполнен").
 * Alle Order-Status-Anzeigen (Web-Admin, Mini-App, Kunden-Bereich) nutzen das.
 * ────────────────────────────────────────────────────────────────────────── */

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; color: string }> = {
  pending:   { label: "Ожидает оплаты", color: "#C9A84C" },
  paid:      { label: "Оплачен",         color: "#7A8B6F" },
  fulfilled: { label: "Отправлен",       color: "#52663F" },
  completed: { label: "Завершён",        color: "#52663F" },
  cancelled: { label: "Отменён",         color: "var(--color-ink-mute)" },
  refunded:  { label: "Возврат",         color: "var(--color-coral-deep, #A53E26)" },
};

/** Sichere Lookup-Variante: unbekannter Status → roher Wert + neutrale Farbe. */
export function orderStatusMeta(status: string): { label: string; color: string } {
  return ORDER_STATUS_META[status as OrderStatus] ?? { label: status, color: "var(--color-ink-mute)" };
}
