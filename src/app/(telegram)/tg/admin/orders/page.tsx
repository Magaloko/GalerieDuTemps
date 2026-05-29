import Link from "next/link";
import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { TelegramAuthGate } from "../../auth-gate";
import { query } from "@/lib/db";
import { OrderRow } from "./order-row";
import { Package, ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import type { OrderStatus } from "@/types/commerce";
import { orderStatusMeta } from "@/lib/utils/order-status";

export const metadata: Metadata = {
  title:  "Заказы · Mini-App",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /tg/admin/orders — Pending-Orders-Queue für Admin.
 *
 * Zeigt die letzten 30 unversendeten Bestellungen (status='pending' oder
 * 'paid' UND versendet_am IS NULL). Klick öffnet Web-Detail in neuem Tab
 * für Tracking-Nummer-Eingabe etc.
 *
 * Phase 2: Quick-Actions inline (Status auf „fulfilled" setzen,
 * Tracking-Nr direkt in Mini-App eingeben).
 * ────────────────────────────────────────────────────────────────────────── */
export default async function TgAdminOrdersPage() {
  const session = await getWebAppSession();
  if (!session || session.role !== "admin") {
    return (
      <TelegramAuthGate>
        <main className="p-6 text-center min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <Package className="w-10 h-10" style={{ color: "var(--color-ink-mute)" }} />
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   18,
              color:      "var(--tg-theme-text-color, var(--color-ink))",
            }}
          >
            Только для администраторов
          </p>
          <Link
            href="/tg"
            className="text-[11px] uppercase font-medium"
            style={{ letterSpacing: "0.22em", color: "var(--color-coral)" }}
          >
            ← В каталог
          </Link>
        </main>
      </TelegramAuthGate>
    );
  }

  const r = await query<{
    id: string;
    order_number: number;
    status: OrderStatus;
    total_cents: number;
    erstellt_am: string;
    customer_email: string | null;
    customer_name: string | null;
    payment_method: string | null;
    payment_status: string | null;
    anzahlung_cents: number | null;
  }>(
    `SELECT id, order_number, status, total_cents, erstellt_am,
            customer_email, customer_name,
            payment_method, payment_status, anzahlung_cents
     FROM sebo.orders
     WHERE status IN ('pending','paid') AND versendet_am IS NULL
     ORDER BY erstellt_am DESC
     LIMIT 30`,
  );
  const orders = r.rows;

  return (
    <TelegramAuthGate>
      <main className="p-4">
        <Link
          href="/tg/admin"
          className="inline-flex items-center gap-1 mb-4 text-[11px] uppercase font-medium"
          style={{
            letterSpacing: "0.18em",
            color:         "var(--tg-theme-link-color, var(--color-coral))",
          }}
        >
          <ChevronLeft className="w-3 h-3" /> Назад
        </Link>

        <header className="mb-5">
          <p
            className="flex items-center gap-2 text-[10px] uppercase font-medium mb-1"
            style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
          >
            <Package className="w-3 h-3" /> Очередь
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   24,
              color:      "var(--tg-theme-text-color, var(--color-ink))",
              lineHeight: 1.1,
            }}
          >
            Заказы к обработке
          </h1>
          <p
            className="mt-1 text-xs"
            style={{
              fontFamily: "var(--font-italic)",
              fontStyle:  "italic",
              color:      "var(--tg-theme-hint-color, var(--color-ink-soft))",
            }}
          >
            {orders.length} {orders.length === 1 ? "заказ" : orders.length < 5 ? "заказа" : "заказов"}
          </p>
        </header>

        {orders.length === 0 ? (
          <div
            className="p-6 text-center"
            style={{
              background: "var(--tg-theme-section-bg-color, #fff)",
              border:     "1px solid var(--color-line)",
            }}
          >
            <Package className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--color-ink-mute)" }} />
            <p
              className="text-sm"
              style={{
                fontFamily: "var(--font-italic)",
                fontStyle:  "italic",
                color:      "var(--tg-theme-hint-color, var(--color-ink-soft))",
              }}
            >
              Очередь пуста. Все заказы обработаны.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map(o => {
              const meta = orderStatusMeta(o.status);
              return (
                <OrderRow
                  key={o.id}
                  id={o.id}
                  orderNumber={o.order_number}
                  status={o.status === "paid" ? "paid" : "pending"}
                  totalCents={o.total_cents}
                  kunde={o.customer_name ?? o.customer_email ?? "—"}
                  statusLabel={meta.label}
                  statusColor={meta.color}
                  paymentMethod={o.payment_method}
                  paymentStatus={o.payment_status}
                  anzahlungCents={o.anzahlung_cents}
                />
              );
            })}
          </div>
        )}
      </main>
    </TelegramAuthGate>
  );
}
