import { notFound } from "next/navigation";
import Link from "next/link";
import { orderById } from "@/lib/db/orders";
import { formatPreis } from "@/lib/utils/preis";
import {
  CheckCircle2, ArrowRight, Package, Mail, MessageCircle, Receipt,
} from "lucide-react";
import { CartLeerenClient } from "./cart-leeren-client";
import { StepIndicator } from "@/components/checkout/step-indicator";
import { TrustStrip } from "@/components/checkout/trust-strip";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n";

export const metadata: Metadata = {
  title:  "Заказ оформлен",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /checkout/erfolg/[id] — Bestätigungs-Seite nach erfolgreichem Checkout.
 *
 * Galerie-Design (paper-BG, ink-text, coral-accents).
 * Sub-Komponenten:
 *  - StepIndicator (current="done")
 *  - Hero: groß-formatige Danke + Order-Number prominent
 *  - Order-Card: Items + Totals
 *  - Next-Steps-Grid: WhatsApp, Konto, Stöbern
 *  - TrustStrip
 * ────────────────────────────────────────────────────────────────────────── */
export default async function ErfolgPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, { t }] = await Promise.all([orderById(id), getDictionary()]);
  if (!order) notFound();

  return (
    <div
      style={{ background: "var(--color-paper)", color: "var(--color-ink)" }}
      className="min-h-[100dvh]"
    >
      <CartLeerenClient />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">

        <StepIndicator current="done" />

        {/* ─ Hero ─────────────────────────────────────────────── */}
        <section className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center mb-6"
            style={{
              width:        72,
              height:       72,
              background:   "rgba(127,140,90,0.12)",
              border:       "1px solid rgba(127,140,90,0.40)",
              borderRadius: "50%",
            }}
          >
            <CheckCircle2 className="w-8 h-8" style={{ color: "#52663F" }} />
          </div>

          <p
            className="text-[11px] uppercase font-medium mb-3"
            style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
          >
            ✦ Заказ принят
          </p>
          <h1
            className="mb-4"
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   "clamp(2.25rem, 5vw, 3rem)",
              color:      "var(--color-ink)",
              lineHeight: 1.05,
            }}
          >
            {t.cart.danke}
          </h1>
          <p
            className="text-sm max-w-md mx-auto"
            style={{
              fontFamily: "var(--font-italic)",
              fontStyle:  "italic",
              color:      "var(--color-ink-soft)",
              lineHeight: 1.6,
            }}
          >
            {t.cart.bestaetigung_text}{" "}
            <strong className="not-italic font-mono" style={{ color: "var(--color-ink)" }}>
              {order.customer_email}
            </strong>
          </p>

          {/* Order-Number Badge */}
          <div
            className="inline-flex items-center gap-2 mt-6 px-4 py-2"
            style={{
              background: "#fff",
              border:     "1px solid var(--color-line)",
            }}
          >
            <Receipt className="w-3.5 h-3.5" style={{ color: "var(--color-coral)" }} />
            <span
              className="text-[10px] uppercase font-medium"
              style={{ letterSpacing: "0.22em", color: "var(--color-ink-soft)" }}
            >
              {t.cart.bestellnummer}
            </span>
            <span
              className="font-mono text-sm"
              style={{ color: "var(--color-ink)" }}
            >
              GDT-{order.order_number}
            </span>
          </div>
        </section>

        {/* ─ Order-Card ───────────────────────────────────────── */}
        <section
          className="p-6 md:p-8 mb-8"
          style={{
            background: "#fff",
            border:     "1px solid var(--color-line)",
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Package className="w-4 h-4" style={{ color: "var(--color-coral)" }} />
            <h2
              className="text-[11px] uppercase font-medium"
              style={{ letterSpacing: "0.22em", color: "var(--color-ink)" }}
            >
              Состав заказа
            </h2>
          </div>

          {/* Items */}
          <ul className="space-y-3 mb-6">
            {(order.items ?? []).map(item => (
              <li
                key={item.id}
                className="flex items-center gap-3 py-2"
                style={{ borderBottom: "1px solid var(--color-line)" }}
              >
                <div
                  className="w-12 h-12 shrink-0 overflow-hidden"
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
                  <p
                    className="text-sm truncate"
                    style={{
                      fontFamily: "var(--font-display)",
                      color:      "var(--color-ink)",
                    }}
                  >
                    {item.produkt_name}
                  </p>
                  <p
                    className="text-[11px]"
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
                  className="font-mono text-sm tabular-nums"
                  style={{ color: "var(--color-ink)" }}
                >
                  {formatPreis(item.zeile_total_cents / 100)}
                </p>
              </li>
            ))}
          </ul>

          {/* Totals */}
          <div className="space-y-1.5 text-sm">
            <Row label={t.cart.zwischensumme} value={formatPreis(order.subtotal_cents / 100)} />
            {order.rabatt_cents > 0 && (
              <Row
                label={t.cart.rabatt}
                value={`− ${formatPreis(order.rabatt_cents / 100)}`}
                color="var(--color-coral)"
              />
            )}
            <Row
              label={t.cart.inkl_ust}
              value={formatPreis(order.tax_total_cents / 100)}
              muted
            />

            <div
              className="flex items-baseline justify-between pt-3 mt-3"
              style={{ borderTop: "1px solid var(--color-line)" }}
            >
              <span
                className="text-[11px] uppercase font-medium"
                style={{ letterSpacing: "0.22em", color: "var(--color-ink-soft)" }}
              >
                {t.cart.gezahlt}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize:   28,
                  color:      "var(--color-ink)",
                  lineHeight: 1,
                }}
              >
                {formatPreis(order.total_cents / 100)}
              </span>
            </div>
          </div>
        </section>

        {/* ─ Next Steps ───────────────────────────────────────── */}
        <section className="grid sm:grid-cols-2 gap-3 mb-10">
          {order.customer_id && (
            <NextStepCard
              href={`/kunde/bestellungen/${order.id}`}
              icon={Package}
              title={t.cart.zum_konto}
              sub="Статус · история · документы"
              primary
            />
          )}
          <NextStepCard
            href="/kontakt"
            icon={MessageCircle}
            title="Связаться с нами"
            sub="WhatsApp · Telegram · Mail"
          />
          <NextStepCard
            href="/katalog"
            icon={ArrowRight}
            title={t.cart.weiter_stoebern}
            sub="Новые поступления каждую среду"
          />
          <NextStepCard
            href={`mailto:${order.customer_email}`}
            icon={Mail}
            title="Письмо не пришло?"
            sub="Проверьте «Спам» или напишите нам"
            external
          />
        </section>

        <TrustStrip />
      </div>
    </div>
  );
}

/* ── Sub-Components ───────────────────────────────────────────────────── */

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
        color: color
          ?? (muted ? "var(--color-ink-mute)" : "var(--color-ink-soft)"),
        fontSize: muted ? 12 : 14,
      }}
    >
      <span>{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}

function NextStepCard({
  href, icon: Icon, title, sub, primary, external,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  sub:   string;
  primary?: boolean;
  external?: boolean;
}) {
  const Cmp = external ? "a" : Link;
  const inner = (
    <>
      <div className="flex items-start gap-3">
        <Icon
          className="w-4 h-4 mt-0.5 shrink-0"
          style={{ color: primary ? "var(--color-coral)" : "var(--color-ink-soft)" }}
        />
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-medium"
            style={{
              fontFamily: "var(--font-display)",
              color:      "var(--color-ink)",
            }}
          >
            {title}
          </p>
          <p
            className="text-[11px] mt-0.5"
            style={{
              fontFamily: "var(--font-italic)",
              fontStyle:  "italic",
              color:      "var(--color-ink-mute)",
            }}
          >
            {sub}
          </p>
        </div>
        <ArrowRight
          className="w-3.5 h-3.5 opacity-40 shrink-0 mt-0.5"
          style={{ color: "var(--color-ink)" }}
        />
      </div>
    </>
  );
  const cls = "block p-4 transition-shadow hover:shadow-soft";
  const style: React.CSSProperties = {
    background: "#fff",
    border:     `1px solid ${primary ? "var(--color-coral)" : "var(--color-line)"}`,
    borderLeftWidth: primary ? 3 : 1,
  };
  if (external) {
    return <a href={href} className={cls} style={style}>{inner}</a>;
  }
  return <Cmp href={href} className={cls} style={style}>{inner}</Cmp>;
}
