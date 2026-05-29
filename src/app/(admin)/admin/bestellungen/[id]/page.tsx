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
  const { id } = await params;
  const order = await orderById(id);
  if (!order) notFound();

  return (
    <div className="space-y-6 max-w-4xl">
      <nav className="flex items-center gap-2 text-xs font-sans text-vintage-dust">
        <Link href="/admin/bestellungen" className="hover:text-vintage-brown flex items-center gap-1 transition-colors">
          <ChevronLeft className="w-3 h-3" /> Заказы
        </Link>
        <span>/</span>
        <span className="font-mono text-vintage-gold">GDT-{String(order.order_number).padStart(4, "0")}</span>
      </nav>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items */}
        <section className="lg:col-span-2 bg-vintage-white border border-vintage-sand p-6 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
          <h2 className="font-serif text-lg text-vintage-espresso flex items-center gap-2">
            <Package className="w-4 h-4 text-vintage-gold" /> Товары
          </h2>
          <div className="divide-y divide-vintage-sand/50">
            {(order.items ?? []).map(item => (
              <div key={item.id} className="flex items-center gap-3 py-3">
                <div className="w-14 h-14 bg-vintage-parchment overflow-hidden flex-shrink-0" style={{ borderRadius: "var(--radius-vintage)" }}>
                  {item.produkt_bild_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.produkt_bild_url} alt={item.produkt_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-vintage-sand">✦</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-vintage-espresso truncate">{item.produkt_name}</p>
                  <p className="text-xs text-vintage-dust font-sans">
                    {item.menge}× · {formatPreis(item.einzelpreis_cents / 100)} · НДС {item.tax_rate}%
                  </p>
                </div>
                <p className="font-serif text-vintage-espresso">{formatPreis(item.zeile_total_cents / 100)}</p>
              </div>
            ))}
          </div>

          {/* Summen */}
          <div className="space-y-1 text-sm font-sans border-t border-vintage-sand pt-4">
            <div className="flex justify-between text-vintage-dust">
              <span>Промежуточная сумма</span><span>{formatPreis(order.subtotal_cents / 100)}</span>
            </div>
            {order.rabatt_cents > 0 && (
              <div className="flex justify-between text-vintage-sage">
                <span>Скидка ({order.coupon_code_snapshot})</span><span>− {formatPreis(order.rabatt_cents / 100)}</span>
              </div>
            )}
            <div className="flex justify-between text-vintage-dust text-xs">
              <span>вкл. НДС</span><span>{formatPreis(order.tax_total_cents / 100)}</span>
            </div>
            <div className="flex justify-between font-serif text-vintage-espresso text-lg pt-2 border-t border-vintage-sand">
              <span>Итого</span><span>{formatPreis(order.total_cents / 100)}</span>
            </div>
          </div>
        </section>

        {/* Meta */}
        <div className="space-y-4">
          <section className="bg-vintage-white border border-vintage-sand p-5 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
            <h3 className="font-serif text-vintage-espresso flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-vintage-gold" /> Клиент
            </h3>
            <div className="text-sm font-sans text-vintage-brown space-y-1">
              <p>{order.customer_name ?? "Гость"}</p>
              <p className="text-vintage-dust">{order.customer_email}</p>
              <p className="text-xs uppercase tracking-wider text-vintage-dust mt-2">
                Тип: {order.customer_type_snapshot}
              </p>
            </div>
          </section>

          <section className="bg-vintage-white border border-vintage-sand p-5 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
            <h3 className="font-serif text-vintage-espresso flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-vintage-gold" /> Адрес доставки
            </h3>
            <div className="text-sm font-sans text-vintage-brown space-y-0.5">
              {order.shipping_address.vorname || order.shipping_address.nachname ? (
                <>
                  <p>{order.shipping_address.vorname} {order.shipping_address.nachname}</p>
                  <p>{order.shipping_address.strasse}</p>
                  <p>{order.shipping_address.plz} {order.shipping_address.ort}</p>
                  <p>{order.shipping_address.land}</p>
                </>
              ) : (
                <p className="text-vintage-dust italic">Из Stripe Checkout — будет добавлено через webhook</p>
              )}
            </div>
          </section>

          <section className="bg-vintage-white border border-vintage-sand p-5 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
            <h3 className="font-serif text-vintage-espresso flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-vintage-gold" /> Оплата
            </h3>
            <div className="text-sm font-sans text-vintage-brown space-y-1">
              {order.payment_method && (
                <p>Способ: <strong>{PAY_METHOD_LABEL[order.payment_method] ?? order.payment_method}</strong></p>
              )}
              <p>Оплата: <strong>{PAY_STATUS_LABEL[order.payment_status ?? ""] ?? (order.payment_status || "—")}</strong></p>
              <p className="text-xs text-vintage-dust">Статус заказа: {order.status}</p>
              {(order.anzahlung_cents ?? 0) > 0 && (
                <div className="text-xs text-vintage-dust pt-1 space-y-0.5">
                  <p>Предоплата: {formatPreis((order.anzahlung_cents ?? 0) / 100)}
                    {order.anzahlung_bezahlt_am ? " ✓" : " (ожидается)"}</p>
                  <p>Остаток: {formatPreis((order.total_cents - (order.anzahlung_cents ?? 0)) / 100)}</p>
                </div>
              )}
              {order.payment_reference && (
                <p className="text-xs font-mono text-vintage-dust">Реф: {order.payment_reference}</p>
              )}
              {order.bezahlt_am && <p className="text-xs text-vintage-dust">Оплачен: {new Date(order.bezahlt_am).toLocaleString("ru-RU")}</p>}
              {order.stripe_payment_intent && (
                <p className="text-xs font-mono text-vintage-dust truncate">PI: {order.stripe_payment_intent}</p>
              )}
            </div>

            {/* Anzahlung/Zahlungs-Lebenszyklus (nur solange nicht storniert/refundiert) */}
            {order.status !== "cancelled" && order.status !== "refunded" && (
              <PaymentLifecycle
                orderId={order.id}
                paymentMethod={order.payment_method ?? null}
                paymentStatus={order.payment_status ?? null}
                anzahlungCents={order.anzahlung_cents ?? null}
                restCents={order.total_cents - (order.anzahlung_cents ?? 0)}
              />
            )}
          </section>
        </div>
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
