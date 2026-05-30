import { getModuleBase } from "@/lib/module-base-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { orderById } from "@/lib/db/orders";
import { formatPreis } from "@/lib/utils/preis";
import { BestellungEditor } from "@/components/bestellungen/bestellung-editor";
import { PaymentLifecycle } from "@/components/bestellungen/payment-lifecycle";
import { ChevronLeft, Package, Mail, MapPin, CreditCard } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Детали заказа" };
export const dynamic = "force-dynamic";

const PAY_METHOD_LABEL: Record<string, string> = {
  stripe_card:        "Карта (Stripe)",
  stripe_sepa:        "SEPA (Stripe)",
  paypal:             "PayPal",
  crypto_nowpayments: "Криптовалюта",
  bank_transfer:      "Банковский перевод",
  vor_ort:            "Самовывоз — оплата на месте",
  vor_ort_anzahlung:  "Самовывоз — с предоплатой",
  telegram_payments:  "Telegram Payments",
  kaspi:              "Kaspi.kz",
};

const PAY_STATUS_LABEL: Record<string, string> = {
  unpaid:   "Не оплачен",
  pending:  "Ожидает оплаты",
  partial:  "Предоплата внесена",
  paid:     "Оплачен полностью",
  refunded: "Возврат",
  failed:   "Ошибка оплаты",
};

export default async function BestellungDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const base = await getModuleBase();
  const { id } = await params;
  const order = await orderById(id);
  if (!order) notFound();

  return (
    <div className="space-y-6 max-w-5xl">
      <nav className="record-breadcrumb">
        <Link href={`${base}/bestellungen`}>
          <ChevronLeft className="w-3 h-3" /> Заказы
        </Link>
        <span>/</span>
        <span className="crumb-id">GDT-{String(order.order_number).padStart(4, "0")}</span>
      </nav>

      <div className="record-layout">
        {/* Hauptspalte: Товары + Summen */}
        <div className="record-main">
          <section className="record-card space-y-4">
            <h2 className="record-section-title">
              <Package className="w-4 h-4" /> Товары
            </h2>
            <div style={{ borderTop: "1px solid var(--color-line)" }}>
              {(order.items ?? []).map(item => (
                <div key={item.id} className="flex items-center gap-3 py-3" style={{ borderBottom: "1px solid var(--color-line)" }}>
                  <div className="w-14 h-14 overflow-hidden flex-shrink-0" style={{ background: "var(--color-paper-warm)", borderRadius: "var(--radius-vintage)" }}>
                    {item.produkt_bild_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.produkt_bild_url} alt={item.produkt_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ color: "var(--color-ink-mute)" }}>✦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif truncate" style={{ color: "var(--color-ink)" }}>{item.produkt_name}</p>
                    <p className="text-xs font-sans" style={{ color: "var(--color-ink-mute)" }}>
                      {item.menge}× · {formatPreis(item.einzelpreis_cents / 100)} · НДС {item.tax_rate}%
                    </p>
                  </div>
                  <p className="font-serif" style={{ color: "var(--color-ink)", fontVariantNumeric: "tabular-nums" }}>{formatPreis(item.zeile_total_cents / 100)}</p>
                </div>
              ))}
            </div>

            {/* Summen */}
            <div className="space-y-1.5 pt-1">
              <div className="amount-row">
                <span>Промежуточная сумма</span><span>{formatPreis(order.subtotal_cents / 100)}</span>
              </div>
              {order.rabatt_cents > 0 && (
                <div className="amount-row" style={{ color: "var(--color-vintage-forest)" }}>
                  <span>Скидка ({order.coupon_code_snapshot})</span><span>− {formatPreis(order.rabatt_cents / 100)}</span>
                </div>
              )}
              <div className="amount-row" style={{ fontSize: "0.75rem" }}>
                <span>вкл. НДС</span><span>{formatPreis(order.tax_total_cents / 100)}</span>
              </div>
              <div className="amount-row amount-row-total">
                <span>Итого</span><span>{formatPreis(order.total_cents / 100)}</span>
              </div>
            </div>
          </section>
        </div>

        {/* Aside: Stammdaten (Клиент / Адрес / Оплата) */}
        <aside className="record-aside">
          <section className="record-card">
            <h3 className="record-section-title mb-3">
              <Mail className="w-3.5 h-3.5" /> Клиент
            </h3>
            <div className="field-group">
              <div className="field-row">
                <span className="field-label">Имя</span>
                <span className="field-value">{order.customer_name ?? "Гость"}</span>
              </div>
              <div className="field-row">
                <span className="field-label">E-mail</span>
                <span className="field-value">{order.customer_email}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Тип</span>
                <span className="field-value">{order.customer_type_snapshot}</span>
              </div>
            </div>
          </section>

          <section className="record-card">
            <h3 className="record-section-title mb-3">
              <MapPin className="w-3.5 h-3.5" /> Адрес доставки
            </h3>
            {order.shipping_address.vorname || order.shipping_address.nachname ? (
              <div className="field-value" style={{ lineHeight: 1.6 }}>
                {order.shipping_address.vorname} {order.shipping_address.nachname}<br />
                {order.shipping_address.strasse}<br />
                {order.shipping_address.plz} {order.shipping_address.ort}<br />
                {order.shipping_address.land}
              </div>
            ) : (
              <p className="field-value" style={{ color: "var(--color-ink-mute)", fontStyle: "italic" }}>Из Stripe Checkout — будет добавлено через webhook</p>
            )}
          </section>

          <section className="record-card">
            <h3 className="record-section-title mb-3">
              <CreditCard className="w-3.5 h-3.5" /> Оплата
            </h3>
            <div className="field-group">
              {order.payment_method && (
                <div className="field-row">
                  <span className="field-label">Способ</span>
                  <span className="field-value">{PAY_METHOD_LABEL[order.payment_method] ?? order.payment_method}</span>
                </div>
              )}
              <div className="field-row">
                <span className="field-label">Оплата</span>
                <span className="field-value">{PAY_STATUS_LABEL[order.payment_status ?? ""] ?? (order.payment_status || "—")}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Статус заказа</span>
                <span className="field-value">{order.status}</span>
              </div>
              {(order.anzahlung_cents ?? 0) > 0 && (
                <>
                  <div className="field-row">
                    <span className="field-label">Предоплата</span>
                    <span className="field-value">{formatPreis((order.anzahlung_cents ?? 0) / 100)}{order.anzahlung_bezahlt_am ? " ✓" : " (ожидается)"}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Остаток</span>
                    <span className="field-value">{formatPreis((order.total_cents - (order.anzahlung_cents ?? 0)) / 100)}</span>
                  </div>
                </>
              )}
              {order.payment_reference && (
                <div className="field-row">
                  <span className="field-label">Реф</span>
                  <span className="field-value field-value-mono">{order.payment_reference}</span>
                </div>
              )}
              {order.bezahlt_am && (
                <div className="field-row">
                  <span className="field-label">Оплачен</span>
                  <span className="field-value">{new Date(order.bezahlt_am).toLocaleString("ru-RU")}</span>
                </div>
              )}
              {order.stripe_payment_intent && (
                <div className="field-row">
                  <span className="field-label">Payment Intent</span>
                  <span className="field-value field-value-mono truncate">{order.stripe_payment_intent}</span>
                </div>
              )}
            </div>

            {/* Anzahlung/Zahlungs-Lebenszyklus (nur solange nicht storniert/refundiert) */}
            {order.status !== "cancelled" && order.status !== "refunded" && (
              <div className="mt-3">
                <PaymentLifecycle
                  orderId={order.id}
                  paymentMethod={order.payment_method ?? null}
                  paymentStatus={order.payment_status ?? null}
                  anzahlungCents={order.anzahlung_cents ?? null}
                  restCents={order.total_cents - (order.anzahlung_cents ?? 0)}
                />
              </div>
            )}
          </section>
        </aside>
      </div>

      {/* ─── Editor-Block ────────────────────────────────────────── */}
      <BestellungEditor
        orderId={order.id}
        initialStatus={order.status}
        initialTracking={{ nummer: order.tracking_nummer, url: order.tracking_url }}
        initialNotizen={{ interne: order.interne_notiz, kunden: order.kunden_notiz }}
        storniert={order.status === "cancelled"}
      />
    </div>
  );
}
