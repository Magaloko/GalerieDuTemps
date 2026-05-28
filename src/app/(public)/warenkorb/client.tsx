"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Trash2, Minus, Plus, ShoppingBag, ArrowRight, Tag, X, Loader2,
  CheckCircle2, Heart, AlertTriangle, Truck, AlertCircle,
} from "lucide-react";
import { useCart, berechneCart } from "@/lib/cart";
import { useWunschliste } from "@/hooks/use-wunschliste";
import { useCartSync } from "@/hooks/use-cart-sync";
import { formatPreis } from "@/lib/utils/preis";

export interface CartLabels {
  leer: string; leer_text: string; zum_katalog: string;
  zusammenfassung: string; coupon: string; code_aktiv: string; code_eingeben: string;
  zwischensumme: string; rabatt: string; versand: string; versand_calc: string;
  inkl_ust: string; summe: string; zur_kasse: string;
  laedt: string; sichere_zahlung: string;
  coupon_fehler: string; checkout_fehler: string; entfernen: string;
}

// Kostenlose Versand ab dieser Schwelle (in Cents — entspricht ₸50 000).
// TODO: aus System-Einstellungen laden statt hardcoded.
const FREE_SHIPPING_THRESHOLD_CENTS = 50_000_00;

/* ──────────────────────────────────────────────────────────────────────────
 * WarenkorbClient — Galerie-Design (paper-BG, coral-accents).
 *
 * Layout:
 *   ┌──────────────────────────────┬──────────────────┐
 *   │ Items (cards mit lines)      │ Sticky-Summary   │
 *   │  + "Сохранить на потом"      │  • Coupon        │
 *   │  + Stock-Warning             │  • Free-Ship-Bar │
 *   │                              │  • Totals        │
 *   │                              │  • Coral-CTA     │
 *   └──────────────────────────────┴──────────────────┘
 *   ┌────────────── TrustStrip ───────────────────────┐
 *
 * Mobile: 1-Col, Summary unter Items, Sticky-Bottom-Bar mit Total + CTA.
 * ────────────────────────────────────────────────────────────────────────── */
export function WarenkorbClient({ labels }: { labels: CartLabels }) {
  // Sync mit /api/cart bei eingeloggtem Customer — Anonymous bleibt auf
  // localStorage (silent 401). Polling für Web ist standardmäßig aus weil
  // unwahrscheinlich dass User parallel Cart in 2 Browser-Tabs ändert.
  useCartSync();

  const items         = useCart(s => s.items);
  const coupon_code   = useCart(s => s.coupon_code);
  const mengeAendern  = useCart(s => s.mengeAendern);
  const entfernen     = useCart(s => s.entfernen);
  const setCouponCode = useCart(s => s.setCouponCode);
  const { toggle: toggleWish, istGemerkt } = useWunschliste();

  const [hydrated, setHydrated] = useState(false);
  const [couponInput, setCouponInput] = useState(coupon_code ?? "");
  const [couponPending, setCouponPending] = useState(false);
  const [couponFehler,  setCouponFehler]  = useState<string | null>(null);
  const [rabattCents,   setRabattCents]   = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError,   setCheckoutError]   = useState<string | null>(null);
  const [checkoutRetryIn, setCheckoutRetryIn] = useState<number>(0);

  useEffect(() => { setHydrated(true); }, []);

  const berechnung = useMemo(() => berechneCart({
    items,
    rabatt_cents:  rabattCents,
    versand_cents: 0,
  }), [items, rabattCents]);

  // Free-Shipping-Progress
  const subtotal = berechnung.subtotal_cents - berechnung.rabatt_cents;
  const freeShipReached = subtotal >= FREE_SHIPPING_THRESHOLD_CENTS;
  const freeShipMissing = Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - subtotal);
  const freeShipPct     = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD_CENTS) * 100);

  const handleCouponEinloesen = async () => {
    setCouponFehler(null);
    setCouponPending(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          code:           couponInput,
          subtotal_cents: berechnung.subtotal_cents,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setCouponFehler(data.fehler ?? labels.coupon_fehler);
        setRabattCents(0);
        setCouponCode(undefined);
      } else {
        setRabattCents(data.rabatt_cents);
        setCouponCode(couponInput.toUpperCase());
      }
    } catch {
      setCouponFehler(labels.coupon_fehler);
    } finally {
      setCouponPending(false);
    }
  };

  const handleCouponEntfernen = () => {
    setRabattCents(0);
    setCouponCode(undefined);
    setCouponInput("");
    setCouponFehler(null);
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setCheckoutError(null);
    setCheckoutRetryIn(0);
    try {
      const res = await fetch("/api/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          items: items.map(i => ({
            produkt_id: i.produkt_id,
            menge:      i.menge,
          })),
          coupon_code: coupon_code,
          picker:      true,
        }),
      });
      const data = await res.json();
      const target = data.redirect_to ?? data.checkout_url;
      if (target) {
        // Redirect — Loading-State bleibt aktiv damit der Button nicht wieder
        // "klickbar" wirkt während der Browser navigiert.
        window.location.href = target;
        return;
      }
      setCheckoutError(data.error ?? labels.checkout_fehler);
      if (typeof data.retry_after === "number") {
        setCheckoutRetryIn(data.retry_after);
      }
    } catch {
      setCheckoutError(labels.checkout_fehler);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleSaveForLater = async (produktId: string) => {
    if (!istGemerkt(produktId)) {
      await toggleWish(produktId);
    }
    entfernen(produktId);
  };

  if (!hydrated) {
    return (
      <div className="text-center py-16">
        <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: "var(--color-ink-mute)" }} />
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyCart labels={labels} />;
  }

  return (
    <>
      <div className="grid lg:grid-cols-[1fr_360px] gap-8">
        {/* ─── Items-Liste ─── */}
        <div className="space-y-3">
          {items.map(item => (
            <CartItemCard
              key={item.produkt_id}
              item={item}
              onMengeChange={mengeAendern}
              onEntfernen={entfernen}
              onSaveForLater={handleSaveForLater}
              labels={labels}
            />
          ))}

          {/* Continue-Shopping-Link */}
          <Link
            href="/katalog"
            className="inline-flex items-center gap-2 text-[11px] uppercase font-medium mt-2 transition-colors hover:text-[var(--color-coral)]"
            style={{
              letterSpacing: "0.22em",
              color:         "var(--color-ink-mute)",
            }}
          >
            ← {labels.zum_katalog}
          </Link>
        </div>

        {/* ─── Summary (Sticky auf Desktop) ─── */}
        <aside className="lg:sticky lg:top-24 h-fit">
          <div
            className="p-6 space-y-5"
            style={{
              background: "#fff",
              border:     "1px solid var(--color-line)",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize:   20,
                color:      "var(--color-ink)",
                lineHeight: 1.1,
              }}
            >
              {labels.zusammenfassung}
            </h2>

            {/* Free-Shipping-Nudge */}
            <FreeShippingBar
              reached={freeShipReached}
              missing={freeShipMissing}
              pct={freeShipPct}
            />

            {/* Coupon */}
            {rabattCents > 0 ? (
              <div
                className="flex items-center justify-between p-3"
                style={{
                  background: "rgba(127,140,90,0.10)",
                  border:     "1px solid rgba(127,140,90,0.35)",
                }}
              >
                <span
                  className="flex items-center gap-2 text-xs"
                  style={{ color: "#52663F" }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{labels.code_aktiv}: <strong className="font-mono">{coupon_code}</strong></span>
                </span>
                <button
                  onClick={handleCouponEntfernen}
                  aria-label="Удалить промокод"
                  className="transition-colors hover:opacity-70"
                  style={{ color: "#52663F" }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div>
                <label
                  className="block mb-1.5 text-[10px] uppercase font-medium"
                  style={{ letterSpacing: "0.22em", color: "var(--color-ink-soft)" }}
                >
                  {labels.coupon}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                      style={{ color: "var(--color-ink-mute)" }}
                    />
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder={labels.code_eingeben}
                      className="w-full pl-9 pr-3 py-2 text-sm font-mono focus:outline-none transition-colors"
                      style={{
                        background: "var(--color-bone)",
                        border:     "1px solid var(--color-line)",
                        color:      "var(--color-ink)",
                        minHeight:  40,
                      }}
                    />
                  </div>
                  <button
                    onClick={handleCouponEinloesen}
                    disabled={!couponInput || couponPending}
                    className="px-4 text-xs uppercase font-medium transition-colors disabled:opacity-50"
                    style={{
                      letterSpacing: "0.18em",
                      background:    "var(--color-ink)",
                      color:         "#fff",
                      minHeight:     40,
                    }}
                  >
                    {couponPending ? "..." : "OK"}
                  </button>
                </div>
                {couponFehler && (
                  <p
                    className="text-xs mt-1.5"
                    style={{ color: "var(--color-coral-deep, #A53E26)" }}
                  >
                    {couponFehler}
                  </p>
                )}
              </div>
            )}

            {/* Totals */}
            <div
              className="space-y-1.5 text-sm pt-4"
              style={{ borderTop: "1px solid var(--color-line)" }}
            >
              <Row label={labels.zwischensumme} value={formatPreis(berechnung.subtotal_cents / 100)} />
              {berechnung.rabatt_cents > 0 && (
                <Row
                  label={labels.rabatt}
                  value={`− ${formatPreis(berechnung.rabatt_cents / 100)}`}
                  color="var(--color-coral)"
                />
              )}
              <Row
                label={labels.versand}
                value={freeShipReached
                  ? <span style={{ color: "#7A8B6F", fontFamily: "var(--font-italic)", fontStyle: "italic" }}>Бесплатно</span>
                  : labels.versand_calc
                }
              />
              <Row
                label={labels.inkl_ust}
                value={formatPreis(berechnung.tax_total_cents / 100)}
                muted
              />

              <div
                className="flex items-baseline justify-between pt-3 mt-2"
                style={{ borderTop: "1px solid var(--color-line)" }}
              >
                <span
                  className="text-[11px] uppercase font-medium"
                  style={{ letterSpacing: "0.22em", color: "var(--color-ink-soft)" }}
                >
                  {labels.summe}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize:   28,
                    color:      "var(--color-ink)",
                    lineHeight: 1,
                  }}
                >
                  {formatPreis(berechnung.total_cents / 100)}
                </span>
              </div>
            </div>

            {/* Inline-Error (statt alert) */}
            {checkoutError && (
              <div
                role="alert"
                className="flex items-start gap-2 p-3 text-xs"
                style={{
                  background: "rgba(232,112,58,0.08)",
                  border:     "1px solid rgba(232,112,58,0.35)",
                  color:      "var(--color-coral-deep, #A53E26)",
                }}
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p>{checkoutError}</p>
                  {checkoutRetryIn > 0 && (
                    <p className="mt-1 opacity-70">
                      Повторить можно через {checkoutRetryIn > 60
                        ? `${Math.ceil(checkoutRetryIn / 60)} мин`
                        : `${checkoutRetryIn} сек`}.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* CTA */}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="btn-coral btn-coral-lg w-full"
              style={{ minHeight: 52, touchAction: "manipulation" }}
            >
              {checkoutLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {labels.laedt}</>
              ) : (
                <>{labels.zur_kasse} <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            <p
              className="text-[11px] text-center"
              style={{
                fontFamily: "var(--font-italic)",
                fontStyle:  "italic",
                color:      "var(--color-ink-mute)",
              }}
            >
              {labels.sichere_zahlung}
            </p>
          </div>
        </aside>
      </div>

      {/* ─── Mobile Sticky-Bottom-Bar ─── */}
      <div
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 px-4 py-3"
        style={{
          background:   "rgba(245, 241, 234, 0.96)",
          borderTop:    "1px solid var(--color-line)",
          backdropFilter: "blur(8px)",
          paddingBottom: "calc(max(12px, env(safe-area-inset-bottom)) + 8px)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p
              className="text-[10px] uppercase font-medium"
              style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
            >
              {labels.summe}
            </p>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize:   22,
                color:      "var(--color-ink)",
                lineHeight: 1,
              }}
            >
              {formatPreis(berechnung.total_cents / 100)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCheckout}
            disabled={checkoutLoading}
            className="btn-coral btn-coral-lg shrink-0"
            style={{ minHeight: 48, touchAction: "manipulation" }}
          >
            {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : labels.zur_kasse}
            {!checkoutLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Sub-Components ───────────────────────────────────────────────────────── */

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
      <span>{value}</span>
    </div>
  );
}

function FreeShippingBar({
  reached, missing, pct,
}: {
  reached: boolean;
  missing: number;
  pct:     number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span
          className="flex items-center gap-1.5 text-[11px]"
          style={{
            color: reached ? "#52663F" : "var(--color-ink-soft)",
          }}
        >
          <Truck className="w-3.5 h-3.5" />
          {reached
            ? <span style={{ fontFamily: "var(--font-italic)", fontStyle: "italic" }}>Бесплатная доставка!</span>
            : <>До бесплатной доставки <strong>{formatPreis(missing / 100)}</strong></>
          }
        </span>
      </div>
      <div
        className="w-full h-1.5 overflow-hidden"
        style={{
          background:   "var(--color-line)",
          borderRadius: 999,
        }}
      >
        <div
          className="h-full transition-all duration-500"
          style={{
            width:      `${pct}%`,
            background: reached ? "#7A8B6F" : "var(--color-coral)",
          }}
        />
      </div>
    </div>
  );
}

function CartItemCard({
  item, onMengeChange, onEntfernen, onSaveForLater, labels,
}: {
  item: ReturnType<typeof useCart.getState>["items"][number];
  onMengeChange: (id: string, menge: number) => void;
  onEntfernen:   (id: string) => void;
  onSaveForLater: (id: string) => void;
  labels: CartLabels;
}) {
  const totalCents = item.einzelpreis_cents * item.menge;
  const istLetztes = !!item.max_menge && item.max_menge === 1;

  return (
    <div
      className="flex gap-4 p-4"
      style={{
        background: "#fff",
        border:     "1px solid var(--color-line)",
      }}
    >
      {/* Bild */}
      <Link
        href={`/katalog/${item.slug}`}
        className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 overflow-hidden"
        style={{ background: "var(--color-bone)" }}
      >
        {item.bild_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.bild_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ color: "var(--color-ink-mute)" }}>✦</div>
        )}
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/katalog/${item.slug}`}
          className="block transition-colors hover:text-[var(--color-coral)]"
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   16,
            color:      "var(--color-ink)",
            lineHeight: 1.25,
          }}
        >
          <span className="line-clamp-2">{item.name}</span>
        </Link>

        {/* Stock-Warning */}
        {istLetztes && (
          <p
            className="flex items-center gap-1 text-[11px] mt-1.5"
            style={{ color: "var(--color-coral-deep, #A53E26)" }}
          >
            <AlertTriangle className="w-3 h-3" />
            Последний экземпляр
          </p>
        )}

        <p
          className="text-[13px] mt-1"
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--color-ink-mute)",
          }}
        >
          {formatPreis(item.einzelpreis_cents / 100)} × {item.menge}
        </p>

        {/* Steppermenu + Actions */}
        <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
          <div
            className="flex items-center"
            style={{ border: "1px solid var(--color-line)" }}
          >
            <button
              onClick={() => onMengeChange(item.produkt_id, item.menge - 1)}
              disabled={item.menge <= 1}
              className="p-2 transition-colors disabled:opacity-30 hover:bg-[var(--color-bone)]"
              aria-label="Уменьшить"
              style={{ color: "var(--color-ink)", minWidth: 32, minHeight: 32 }}
            >
              <Minus className="w-3 h-3" />
            </button>
            <span
              className="px-2 text-sm tabular-nums min-w-7 text-center"
              style={{ color: "var(--color-ink)" }}
            >
              {item.menge}
            </span>
            <button
              onClick={() => onMengeChange(item.produkt_id, item.menge + 1)}
              disabled={!!item.max_menge && item.menge >= item.max_menge}
              className="p-2 transition-colors disabled:opacity-30 hover:bg-[var(--color-bone)]"
              aria-label="Увеличить"
              style={{ color: "var(--color-ink)", minWidth: 32, minHeight: 32 }}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onSaveForLater(item.produkt_id)}
              className="p-2 transition-colors hover:text-[var(--color-coral)]"
              style={{ color: "var(--color-ink-mute)" }}
              title="Сохранить на потом"
              aria-label="Сохранить на потом"
            >
              <Heart className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onEntfernen(item.produkt_id)}
              className="p-2 transition-colors hover:text-[var(--color-coral-deep,#A53E26)]"
              style={{ color: "var(--color-ink-mute)" }}
              aria-label={labels.entfernen}
              title={labels.entfernen}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Zeilen-Total */}
      <div className="text-right">
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   18,
            color:      "var(--color-ink)",
          }}
        >
          {formatPreis(totalCents / 100)}
        </p>
      </div>
    </div>
  );
}

function EmptyCart({ labels }: { labels: CartLabels }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
      style={{
        background: "#fff",
        border:     "1px solid var(--color-line)",
      }}
    >
      <div
        className="inline-flex items-center justify-center mb-5"
        style={{
          width:        72,
          height:       72,
          background:   "var(--color-bone)",
          borderRadius: "50%",
        }}
      >
        <ShoppingBag className="w-7 h-7" style={{ color: "var(--color-ink-mute)" }} />
      </div>

      <p
        className="text-[11px] uppercase font-medium mb-2"
        style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
      >
        ✦
      </p>
      <h2
        className="mb-2"
        style={{
          fontFamily: "var(--font-display)",
          fontSize:   "clamp(1.5rem, 3vw, 2rem)",
          color:      "var(--color-ink)",
          lineHeight: 1.1,
        }}
      >
        {labels.leer}
      </h2>
      <p
        className="text-sm mb-7 max-w-sm"
        style={{
          fontFamily: "var(--font-italic)",
          fontStyle:  "italic",
          color:      "var(--color-ink-soft)",
        }}
      >
        {labels.leer_text}
      </p>

      <Link
        href="/katalog"
        className="btn-coral btn-coral-lg inline-flex items-center gap-2"
        style={{ minHeight: 48 }}
      >
        {labels.zum_katalog} <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
