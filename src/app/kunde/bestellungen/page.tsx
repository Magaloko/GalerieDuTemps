import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ordersFuerCustomer } from "@/lib/db/orders";
import { formatPreis } from "@/lib/utils/preis";
import { ShoppingBag, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import type { OrderStatus } from "@/types/commerce";
import { getDictionary } from "@/i18n";

export const metadata: Metadata = { title: "Мои заказы" };
export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending:   "#C9A84C",
  paid:      "#7A8B6F",
  fulfilled: "#52663F",
  completed: "#52663F",
  cancelled: "var(--color-ink-mute)",
  refunded:  "var(--color-coral-deep, #A53E26)",
};

export default async function MeineBestellungenPage() {
  const session = await auth();
  if (!session || session.user?.role !== "customer") redirect("/kunde/anmelden");

  const [orders, { t, locale }] = await Promise.all([
    ordersFuerCustomer(session.user.id),
    getDictionary(),
  ]);
  const bcp47 = locale === "kz" ? "ru-RU" : locale === "en" ? "en-US" : "ru-RU";

  const STATUS_LABEL: Record<OrderStatus, string> = {
    pending:   t.kunde.status_pending,
    paid:      t.kunde.status_paid,
    fulfilled: t.kunde.status_fulfilled,
    completed: t.kunde.status_completed,
    cancelled: t.kunde.status_cancelled,
    refunded:  t.kunde.status_refunded,
  };

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <header>
        <p
          className="text-[11px] uppercase font-medium mb-2"
          style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
        >
          ✦ {t.kunde.bestellungen_titel}
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   "clamp(1.875rem, 3.5vw, 2.5rem)",
            color:      "var(--color-ink)",
            lineHeight: 1.05,
          }}
        >
          {t.kunde.bestellungen_titel}
        </h1>
        <p
          className="text-sm mt-2"
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--color-ink-soft)",
          }}
        >
          {orders.length} {t.kunde.bestellungen_count}
        </p>
      </header>

      {orders.length === 0 ? (
        <EmptyOrders t={t} />
      ) : (
        <ul className="space-y-2">
          {orders.map(o => {
            const color = STATUS_COLOR[o.status];
            const label = STATUS_LABEL[o.status];
            return (
              <li key={o.id}>
                <Link
                  href={`/kunde/bestellungen/${o.id}`}
                  className="flex items-center justify-between gap-4 p-5 transition-shadow hover:shadow-soft"
                  style={{
                    background: "#fff",
                    border:     "1px solid var(--color-line)",
                    borderLeft: `3px solid ${color}`,
                  }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <p
                        className="font-mono text-sm"
                        style={{ color: "var(--color-ink)" }}
                      >
                        GDT-{o.order_number}
                      </p>
                      <span
                        className="px-2 py-0.5 text-[10px] uppercase font-medium"
                        style={{
                          letterSpacing: "0.18em",
                          background:    `${color}1A`,
                          color:         color,
                          border:        `1px solid ${color}40`,
                        }}
                      >
                        {label}
                      </span>
                    </div>
                    <p
                      className="text-[11px] mt-1.5"
                      style={{
                        fontFamily: "var(--font-italic)",
                        fontStyle:  "italic",
                        color:      "var(--color-ink-mute)",
                      }}
                    >
                      {t.kunde.bestellt_am}{" "}
                      <span style={{ color: "var(--color-ink-soft)", fontStyle: "normal" }}>
                        {new Date(o.erstellt_am).toLocaleDateString(bcp47, {
                          day: "numeric", month: "long", year: "numeric",
                        })}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p
                      className="font-mono tabular-nums"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize:   18,
                        color:      "var(--color-ink)",
                      }}
                    >
                      {formatPreis(o.total_cents / 100)}
                    </p>
                    <ArrowRight className="w-3.5 h-3.5 opacity-40" style={{ color: "var(--color-ink)" }} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EmptyOrders({ t }: { t: Awaited<ReturnType<typeof getDictionary>>["t"] }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
      style={{
        background: "#fff",
        border:     "1px solid var(--color-line)",
      }}
    >
      <div
        className="inline-flex items-center justify-center mb-5"
        style={{
          width:        64,
          height:       64,
          background:   "var(--color-bone)",
          borderRadius: "50%",
        }}
      >
        <ShoppingBag className="w-6 h-6" style={{ color: "var(--color-ink-mute)" }} />
      </div>
      <p
        className="mb-1"
        style={{
          fontFamily: "var(--font-display)",
          fontSize:   18,
          color:      "var(--color-ink)",
        }}
      >
        {t.kunde.keine_bestellungen_kurz}
      </p>
      <p
        className="text-sm mb-5 max-w-sm"
        style={{
          fontFamily: "var(--font-italic)",
          fontStyle:  "italic",
          color:      "var(--color-ink-soft)",
        }}
      >
        Самое время выбрать что-то особенное.
      </p>
      <Link
        href="/katalog"
        className="btn-coral btn-coral-sm inline-flex items-center gap-2"
      >
        {t.cart.zum_katalog} <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
