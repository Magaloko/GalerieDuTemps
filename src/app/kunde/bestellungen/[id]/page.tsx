import { auth } from "@/lib/auth/config";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { orderById } from "@/lib/db/orders";
import { formatPreis } from "@/lib/utils/preis";
import {
  ChevronLeft, Package, FileText, Truck, ExternalLink, Calendar,
} from "lucide-react";
import type { Metadata } from "next";
import type { OrderStatus } from "@/types/commerce";

export const metadata: Metadata = { title: "Детали заказа" };
export const dynamic = "force-dynamic";

const STATUS_META: Record<OrderStatus, { label: string; color: string }> = {
  pending:   { label: "Ожидает оплаты", color: "#C9A84C" },
  paid:      { label: "Оплачен",         color: "#7A8B6F" },
  fulfilled: { label: "Отправлен",       color: "#52663F" },
  completed: { label: "Завершён",        color: "#52663F" },
  cancelled: { label: "Отменён",         color: "var(--color-ink-mute)" },
  refunded:  { label: "Возврат",         color: "var(--color-coral-deep, #A53E26)" },
};

export default async function BestelldetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== "customer") redirect("/kunde/anmelden");

  const { id } = await params;
  const order = await orderById(id);
  if (!order) notFound();
  if (order.customer_id !== session.user.id) notFound();  // Ownership-Check

  const meta = STATUS_META[order.status] ?? { label: order.status, color: "var(--color-ink-mute)" };

  return (
    <div className="max-w-5xl space-y-6">
      {/* ─── Breadcrumb ─────────────────────────────────────── */}
      <nav
        className="flex items-center gap-2 text-[11px] uppercase font-medium"
        style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
      >
        <Link
          href="/kunde/bestellungen"
          className="flex items-center gap-1 transition-colors hover:text-[var(--color-coral)]"
        >
          <ChevronLeft className="w-3 h-3" /> Мои заказы
        </Link>
        <span style={{ color: "var(--color-line)" }}>/</span>
        <span className="font-mono" style={{ letterSpacing: "0.04em", color: "var(--color-ink)" }}>
          GDT-{order.order_number}
        </span>
      </nav>

      {/* ─── Hero ───────────────────────────────────────────── */}
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p
            className="text-[11px] uppercase font-medium mb-2"
            style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
          >
            ✦ Детали заказа
          </p>
          <h1
            className="font-mono"
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   "clamp(2rem, 4vw, 2.75rem)",
              color:      "var(--color-ink)",
              lineHeight: 1.05,
              letterSpacing: "0.02em",
            }}
          >
            GDT-{order.order_number}
          </h1>
          <p
            className="text-sm mt-2 flex items-center gap-2"
            style={{
              fontFamily: "var(--font-italic)",
              fontStyle:  "italic",
              color:      "var(--color-ink-soft)",
            }}
          >
            <Calendar className="w-3.5 h-3.5 not-italic" />
            {new Date(order.erstellt_am).toLocaleDateString("ru-RU", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        </div>

        <span
          className="px-3 py-1.5 text-[11px] uppercase font-medium"
          style={{
            letterSpacing: "0.22em",
            background:    `${meta.color}1A`,
            color:         meta.color,
            border:        `1px solid ${meta.color}40`,
          }}
        >
          {meta.label}
        </span>
      </header>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* ─── Items + Totals ───────────────────────────────── */}
        <section
          className="p-6"
          style={{ background: "#fff", border: "1px solid var(--color-line)" }}
        >
          <h2
            className="flex items-center gap-2 mb-5 text-[11px] uppercase font-medium"
            style={{ letterSpacing: "0.22em", color: "var(--color-ink)" }}
          >
            <Package className="w-3.5 h-3.5" style={{ color: "var(--color-coral)" }} />
            Состав заказа
          </h2>

          <ul className="divide-y" style={{ borderColor: "var(--color-line)" }}>
            {(order.items ?? []).map(item => (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <div
                  className="w-14 h-14 overflow-hidden shrink-0"
                  style={{ background: "var(--color-bone)" }}
                >
                  {item.produkt_bild_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.produkt_bild_url} alt={item.produkt_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ color: "var(--color-ink-mute)" }}>✦</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {item.produkt_slug ? (
                    <Link
                      href={`/katalog/${item.produkt_slug}`}
                      className="block truncate transition-colors hover:text-[var(--color-coral)]"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize:   15,
                        color:      "var(--color-ink)",
                      }}
                    >
                      {item.produkt_name}
                    </Link>
                  ) : (
                    <p
                      className="truncate"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize:   15,
                        color:      "var(--color-ink)",
                      }}
                    >
                      {item.produkt_name}
                    </p>
                  )}
                  <p
                    className="text-[11px] mt-0.5"
                    style={{
                      fontFamily: "var(--font-italic)",
                      fontStyle:  "italic",
                      color:      "var(--color-ink-mute)",
                    }}
                  >
                    {item.menge} × {formatPreis(item.einzelpreis_cents / 100)}
                  </p>
                </div>
                <p
                  className="font-mono tabular-nums text-sm shrink-0"
                  style={{ color: "var(--color-ink)" }}
                >
                  {formatPreis(item.zeile_total_cents / 100)}
                </p>
              </li>
            ))}
          </ul>

          {/* Totals */}
          <div className="space-y-1.5 text-sm pt-4 mt-2" style={{ borderTop: "1px solid var(--color-line)" }}>
            <Row label="Промежуточная сумма" value={formatPreis(order.subtotal_cents / 100)} />
            {order.rabatt_cents > 0 && (
              <Row label="Скидка" value={`− ${formatPreis(order.rabatt_cents / 100)}`} color="var(--color-coral)" />
            )}
            <Row label="включая НДС" value={formatPreis(order.tax_total_cents / 100)} muted />

            <div
              className="flex items-baseline justify-between pt-3 mt-2"
              style={{ borderTop: "1px solid var(--color-line)" }}
            >
              <span
                className="text-[11px] uppercase font-medium"
                style={{ letterSpacing: "0.22em", color: "var(--color-ink-soft)" }}
              >
                Итого
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize:   24,
                  color:      "var(--color-ink)",
                  lineHeight: 1,
                }}
              >
                {formatPreis(order.total_cents / 100)}
              </span>
            </div>
          </div>
        </section>

        {/* ─── Meta-Sidebar ─────────────────────────────────── */}
        <aside className="space-y-3">
          {/* Status / Bezahlt */}
          <div
            className="p-5"
            style={{ background: "#fff", border: "1px solid var(--color-line)" }}
          >
            <p
              className="text-[10px] uppercase font-medium mb-2"
              style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
            >
              Статус
            </p>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize:   18,
                color:      meta.color,
                lineHeight: 1.1,
              }}
            >
              {meta.label}
            </p>
            {order.bezahlt_am && (
              <p
                className="text-[11px] mt-2"
                style={{
                  fontFamily: "var(--font-italic)",
                  fontStyle:  "italic",
                  color:      "var(--color-ink-mute)",
                }}
              >
                Оплачено{" "}
                <span style={{ color: "var(--color-ink-soft)", fontStyle: "normal" }}>
                  {new Date(order.bezahlt_am).toLocaleDateString("ru-RU")}
                </span>
              </p>
            )}
          </div>

          {/* Tracking */}
          {order.tracking_nummer && (
            <div
              className="p-5"
              style={{ background: "#fff", border: "1px solid var(--color-line)" }}
            >
              <p
                className="flex items-center gap-1.5 text-[10px] uppercase font-medium mb-2"
                style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
              >
                <Truck className="w-3 h-3" style={{ color: "var(--color-coral)" }} />
                Отслеживание
              </p>
              <p
                className="font-mono text-sm break-all"
                style={{ color: "var(--color-ink)" }}
              >
                {order.tracking_nummer}
              </p>
              {order.tracking_url && (
                <a
                  href={order.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs transition-colors hover:text-[var(--color-coral)]"
                  style={{ color: "var(--color-ink-soft)" }}
                >
                  Открыть <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {/* Rechnung */}
          <a
            href={`/api/orders/${order.id}/rechnung`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 p-4 transition-shadow hover:shadow-soft"
            style={{ background: "#fff", border: "1px solid var(--color-line)" }}
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4" style={{ color: "var(--color-coral)" }} />
              <span
                className="text-sm"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
              >
                Счёт-фактура
              </span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 opacity-40" style={{ color: "var(--color-ink)" }} />
          </a>
        </aside>
      </div>
    </div>
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
        color: color ?? (muted ? "var(--color-ink-mute)" : "var(--color-ink-soft)"),
        fontSize: muted ? 12 : 14,
      }}
    >
      <span>{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}
