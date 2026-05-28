import Link from "next/link";
import Image from "next/image";
import { ordersFuerCustomerVorschau } from "@/lib/db/orders";
import { customerById } from "@/lib/db/customers";
import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { formatPreis } from "@/lib/utils/preis";
import { TelegramAuthGate } from "../auth-gate";
import { ShoppingBag, ArrowRight, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import type { OrderStatus } from "@/types/commerce";

export const metadata: Metadata = {
  title: "Заказы · Galerie du Temps",
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
 * /tg/orders — Order-Historie für linked Customer.
 *
 * Sieht den Mini-App-Session-Cookie (webapp-session.ts) und joined auf
 * sebo.customers + sebo.orders. Wenn kein Cookie / kein Match → CTA zum
 * Verknüpfen über die Website.
 *
 * Same data wie /kunde/bestellungen (Web) — synchronized via shared DB.
 * ────────────────────────────────────────────────────────────────────────── */
export default async function TgOrdersPage() {
  // Session lesen — wenn nicht gesetzt, zeigt AuthGate erstmal seinen
  // „authing…" State und ruft /api/telegram/auth, das wiederum den
  // webapp-Session-Cookie setzt. Beim nächsten Render ist customerId da.
  const session    = await getWebAppSession();
  const customer   = session?.customerId ? await customerById(session.customerId) : null;
  const orders     = customer ? await ordersFuerCustomerVorschau(customer.id).catch(() => []) : [];

  return (
    <TelegramAuthGate>
      <main className="p-4">
        <header className="mb-5">
          <p
            className="text-[10px] uppercase font-medium mb-1"
            style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
          >
            ✦ Заказы
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   24,
              color:      "var(--tg-theme-text-color, var(--color-ink))",
              lineHeight: 1.1,
            }}
          >
            История покупок
          </h1>
          {customer && (
            <p
              className="mt-1 text-xs"
              style={{
                fontFamily: "var(--font-italic)",
                fontStyle:  "italic",
                color:      "var(--tg-theme-hint-color, var(--color-ink-soft))",
              }}
            >
              KD-{customer.customer_number.toString().padStart(4, "0")} · {orders.length} {pluralOrder(orders.length)}
            </p>
          )}
        </header>

        {!customer ? (
          <NoCustomerCTA />
        ) : orders.length === 0 ? (
          <EmptyOrders />
        ) : (
          <ul className="space-y-2">
            {orders.map(o => {
              const meta = STATUS_META[o.status] ?? { label: o.status, color: "var(--color-ink-mute)" };
              return (
                <li key={o.id}>
                  <Link
                    href={`/tg/orders/${o.id}`}
                    className="block p-3"
                    style={{
                      background: "var(--tg-theme-section-bg-color, #fff)",
                      border:     "1px solid var(--color-line)",
                      borderLeft: `3px solid ${meta.color}`,
                      touchAction: "manipulation",
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p
                          className="font-mono text-sm"
                          style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }}
                        >
                          GDT-{o.order_number}
                        </p>
                        <p
                          className="text-[11px] mt-0.5"
                          style={{ color: meta.color }}
                        >
                          {meta.label}
                        </p>
                        <p
                          className="text-[10px] mt-0.5"
                          style={{
                            fontFamily: "var(--font-italic)",
                            fontStyle:  "italic",
                            color:      "var(--tg-theme-hint-color, var(--color-ink-mute))",
                          }}
                        >
                          {new Date(o.erstellt_am).toLocaleDateString("ru-RU", {
                            day: "numeric", month: "long", year: "numeric",
                          })} · {o.item_count} {pluralItem(o.item_count)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className="font-mono tabular-nums"
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize:   16,
                            color:      "var(--tg-theme-text-color, var(--color-ink))",
                          }}
                        >
                          {formatPreis(o.total_cents / 100)}
                        </p>
                        <ArrowRight
                          className="w-3 h-3 inline opacity-40 mt-1"
                          style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }}
                        />
                      </div>
                    </div>

                    {/* Item-Thumbnails (max 4, +N-Overlay bei mehr) */}
                    {o.vorschau_bilder.length > 0 && (
                      <div className="flex gap-1.5 mt-2.5">
                        {o.vorschau_bilder.slice(0, 4).map((url, i) => (
                          <div
                            key={i}
                            className="relative overflow-hidden shrink-0"
                            style={{ width: 44, height: 44, background: "var(--color-paper-warm)", borderRadius: 4 }}
                          >
                            <Image src={url} alt="" fill sizes="44px" className="object-cover" />
                            {i === 3 && o.item_count > 4 && (
                              <span
                                className="absolute inset-0 flex items-center justify-center text-[11px] font-medium"
                                style={{ background: "rgba(15,20,48,0.6)", color: "#fff" }}
                              >
                                +{o.item_count - 4}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </TelegramAuthGate>
  );
}

function NoCustomerCTA() {
  return (
    <div
      className="p-5 text-center"
      style={{
        background: "var(--tg-theme-section-bg-color, #fff)",
        border:     "1px solid var(--color-line)",
      }}
    >
      <UserPlus className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--color-coral)" }} />
      <p
        className="mb-2"
        style={{
          fontFamily: "var(--font-display)",
          fontSize:   16,
          color:      "var(--tg-theme-text-color, var(--color-ink))",
        }}
      >
        Привяжите аккаунт
      </p>
      <p
        className="text-xs mb-4"
        style={{
          fontFamily: "var(--font-italic)",
          fontStyle:  "italic",
          color:      "var(--tg-theme-hint-color, var(--color-ink-soft))",
        }}
      >
        История заказов доступна после привязки Telegram к аккаунту на сайте.
      </p>
      <a
        href="/kunde/profil"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block px-4 py-2 text-[11px] uppercase font-medium"
        style={{
          letterSpacing: "0.22em",
          background:    "var(--color-coral)",
          color:         "#fff",
          touchAction:   "manipulation",
        }}
      >
        Открыть профиль
      </a>
    </div>
  );
}

function EmptyOrders() {
  return (
    <div className="py-12 text-center">
      <ShoppingBag className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--color-ink-mute)" }} />
      <p
        className="mb-1"
        style={{
          fontFamily: "var(--font-display)",
          fontSize:   16,
          color:      "var(--tg-theme-text-color, var(--color-ink))",
        }}
      >
        Заказов пока нет
      </p>
      <p
        className="text-xs mb-4"
        style={{
          fontFamily: "var(--font-italic)",
          fontStyle:  "italic",
          color:      "var(--tg-theme-hint-color, var(--color-ink-soft))",
        }}
      >
        Самое время выбрать что-то особенное.
      </p>
      <Link
        href="/tg"
        className="text-[12px] uppercase font-medium"
        style={{
          letterSpacing: "0.22em",
          color:         "var(--tg-theme-link-color, var(--color-coral))",
        }}
      >
        В каталог →
      </Link>
    </div>
  );
}

function pluralOrder(n: number): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "заказ";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "заказа";
  return "заказов";
}

function pluralItem(n: number): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "товар";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "товара";
  return "товаров";
}
