import Link from "next/link";
import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { TelegramAuthGate } from "../../auth-gate";
import { query } from "@/lib/db";
import { formatPreis } from "@/lib/utils/preis";
import { Package, ChevronLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import type { OrderStatus } from "@/types/commerce";

export const metadata: Metadata = {
  title:  "Заказы · Mini-App",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const STATUS_META: Record<OrderStatus, { label: string; color: string }> = {
  pending:   { label: "Ожидает оплаты", color: "#C9A84C" },
  paid:      { label: "Оплачен",         color: "#7A8B6F" },
  fulfilled: { label: "Отправлен",       color: "#52663F" },
  completed: { label: "Завершён",        color: "#52663F" },
  cancelled: { label: "Отменён",         color: "var(--color-ink-mute)" },
  refunded:  { label: "Возврат",         color: "var(--color-coral-deep, #A53E26)" },
};

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
  }>(
    `SELECT id, order_number, status, total_cents, erstellt_am,
            customer_email, customer_name
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
          <ul className="space-y-2">
            {orders.map(o => {
              const meta = STATUS_META[o.status] ?? STATUS_META.pending;
              return (
                <li key={o.id}>
                  <a
                    href={`/admin/bestellungen/${o.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 p-3"
                    style={{
                      background:  "var(--tg-theme-section-bg-color, #fff)",
                      border:      "1px solid var(--color-line)",
                      borderLeft:  `3px solid ${meta.color}`,
                      touchAction: "manipulation",
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className="font-mono text-xs"
                          style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }}
                        >
                          GDT-{o.order_number}
                        </p>
                        <span
                          className="text-[9px] uppercase font-medium"
                          style={{ letterSpacing: "0.18em", color: meta.color }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <p
                        className="text-[11px] mt-0.5 truncate"
                        style={{
                          fontFamily: "var(--font-italic)",
                          fontStyle:  "italic",
                          color:      "var(--tg-theme-hint-color, var(--color-ink-soft))",
                        }}
                      >
                        {o.customer_name ?? o.customer_email ?? "—"}
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <p
                        className="font-mono tabular-nums text-sm"
                        style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }}
                      >
                        {formatPreis(o.total_cents / 100)}
                      </p>
                      <ArrowRight className="w-3.5 h-3.5 opacity-40" />
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </TelegramAuthGate>
  );
}
