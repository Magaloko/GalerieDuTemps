import { notFound } from "next/navigation";
import Link from "next/link";
import { orderById } from "@/lib/db/orders";
import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { formatPreis } from "@/lib/utils/preis";
import { TelegramAuthGate } from "../../auth-gate";
import { ChevronLeft, Package, Truck, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import type { OrderStatus } from "@/types/commerce";

export const metadata: Metadata = {
  title: "Заказ · Galerie du Temps",
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

export default async function TgOrderDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getWebAppSession();
  if (!session) {
    // AuthGate fängt das im Render — server kann noch nicht laden
    return (
      <TelegramAuthGate>
        <div />
      </TelegramAuthGate>
    );
  }
  const order = await orderById(id);
  if (!order || order.customer_id !== session.customerId) notFound();

  const meta = STATUS_META[order.status] ?? { label: order.status, color: "var(--color-ink-mute)" };

  return (
    <TelegramAuthGate>
      <main className="p-4">
        {/* Back-Link (Telegram has BackButton oben, aber Custom-Link
            ist redundancy für Browser-Fallback und konsistente UX) */}
        <Link
          href="/tg/orders"
          className="inline-flex items-center gap-1 text-[11px] uppercase font-medium mb-4"
          style={{
            letterSpacing: "0.18em",
            color:         "var(--tg-theme-link-color, var(--color-coral))",
          }}
        >
          <ChevronLeft className="w-3 h-3" /> Все заказы
        </Link>

        {/* Header */}
        <header className="mb-5">
          <p
            className="text-[10px] uppercase font-medium mb-1"
            style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
          >
            ✦ Заказ
          </p>
          <h1
            className="font-mono"
            style={{
              fontFamily:    "var(--font-display)",
              fontSize:      26,
              color:         "var(--tg-theme-text-color, var(--color-ink))",
              lineHeight:    1.05,
              letterSpacing: "0.02em",
            }}
          >
            GDT-{order.order_number}
          </h1>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span
              className="px-2 py-0.5 text-[10px] uppercase font-medium"
              style={{
                letterSpacing: "0.22em",
                background:    `${meta.color}1A`,
                color:         meta.color,
                border:        `1px solid ${meta.color}40`,
              }}
            >
              {meta.label}
            </span>
            <span
              className="text-[11px]"
              style={{
                fontFamily: "var(--font-italic)",
                fontStyle:  "italic",
                color:      "var(--tg-theme-hint-color, var(--color-ink-mute))",
              }}
            >
              {new Date(order.erstellt_am).toLocaleDateString("ru-RU", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </span>
          </div>
        </header>

        {/* Tracking */}
        {order.tracking_nummer && (
          <section
            className="p-3 mb-4 flex items-start gap-2"
            style={{
              background: "rgba(127,140,90,0.10)",
              border:     "1px solid rgba(127,140,90,0.35)",
              borderLeft: "3px solid #52663F",
            }}
          >
            <Truck className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#52663F" }} />
            <div className="min-w-0 flex-1">
              <p
                className="text-[10px] uppercase font-medium"
                style={{ letterSpacing: "0.22em", color: "#52663F" }}
              >
                Отслеживание
              </p>
              <p
                className="font-mono text-xs mt-0.5 break-all"
                style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }}
              >
                {order.tracking_nummer}
              </p>
              {order.tracking_url && (
                <a
                  href={order.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1 text-[11px] uppercase font-medium"
                  style={{
                    letterSpacing: "0.22em",
                    color:         "#52663F",
                  }}
                >
                  Открыть <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </section>
        )}

        {/* Items */}
        <section
          className="p-4"
          style={{
            background: "var(--tg-theme-section-bg-color, #fff)",
            border:     "1px solid var(--color-line)",
          }}
        >
          <h2
            className="flex items-center gap-2 mb-3 text-[11px] uppercase font-medium"
            style={{ letterSpacing: "0.22em", color: "var(--tg-theme-text-color, var(--color-ink))" }}
          >
            <Package className="w-3.5 h-3.5" style={{ color: "var(--color-coral)" }} />
            Состав
          </h2>

          <ul className="divide-y" style={{ borderColor: "var(--color-line)" }}>
            {(order.items ?? []).map(item => (
              <li key={item.id} className="flex items-center gap-3 py-2.5">
                <div
                  className="w-12 h-12 shrink-0 overflow-hidden"
                  style={{ background: "var(--color-paper-warm, #f5f0e8)" }}
                >
                  {item.produkt_bild_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.produkt_bild_url}
                      alt={item.produkt_name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs truncate"
                    style={{
                      fontFamily: "var(--font-display)",
                      color:      "var(--tg-theme-text-color, var(--color-ink))",
                    }}
                  >
                    {item.produkt_name}
                  </p>
                  <p
                    className="text-[10px] mt-0.5"
                    style={{
                      fontFamily: "var(--font-italic)",
                      fontStyle:  "italic",
                      color:      "var(--tg-theme-hint-color, var(--color-ink-mute))",
                    }}
                  >
                    {item.menge} × {formatPreis(item.einzelpreis_cents / 100)}
                  </p>
                </div>
                <p
                  className="font-mono text-xs tabular-nums shrink-0"
                  style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }}
                >
                  {formatPreis(item.zeile_total_cents / 100)}
                </p>
              </li>
            ))}
          </ul>

          {/* Totals */}
          <div
            className="space-y-1 text-xs pt-3 mt-2"
            style={{ borderTop: "1px solid var(--color-line)" }}
          >
            <Row label="Промежуточная сумма" value={formatPreis(order.subtotal_cents / 100)} />
            {order.rabatt_cents > 0 && (
              <Row label="Скидка" value={`− ${formatPreis(order.rabatt_cents / 100)}`} color="var(--color-coral)" />
            )}
            <Row label="включая НДС" value={formatPreis(order.tax_total_cents / 100)} muted />

            <div
              className="flex items-baseline justify-between pt-2 mt-2"
              style={{ borderTop: "1px solid var(--color-line)" }}
            >
              <span
                className="text-[10px] uppercase font-medium"
                style={{ letterSpacing: "0.22em", color: "var(--tg-theme-hint-color, var(--color-ink-soft))" }}
              >
                Итого
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize:   20,
                  color:      "var(--tg-theme-text-color, var(--color-ink))",
                }}
              >
                {formatPreis(order.total_cents / 100)}
              </span>
            </div>
          </div>
        </section>
      </main>
    </TelegramAuthGate>
  );
}

function Row({
  label, value, color, muted,
}: {
  label: string;
  value: React.ReactNode;
  color?: string;
  muted?: boolean;
}) {
  return (
    <div
      className="flex justify-between"
      style={{
        color: color ?? (muted ? "var(--tg-theme-hint-color, var(--color-ink-mute))" : "var(--tg-theme-hint-color, var(--color-ink-soft))"),
      }}
    >
      <span>{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}
