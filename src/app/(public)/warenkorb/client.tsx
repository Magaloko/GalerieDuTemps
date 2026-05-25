"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, Tag, X, Loader2, CheckCircle2 } from "lucide-react";
import { useCart, berechneCart } from "@/lib/cart";
import { formatPreis } from "@/lib/utils/preis";

export interface CartLabels {
  leer: string; leer_text: string; zum_katalog: string;
  zusammenfassung: string; coupon: string; code_aktiv: string; code_eingeben: string;
  zwischensumme: string; rabatt: string; versand: string; versand_calc: string;
  inkl_ust: string; summe: string; zur_kasse: string;
  laedt: string; sichere_zahlung: string;
  coupon_fehler: string; checkout_fehler: string; entfernen: string;
}

export function WarenkorbClient({ labels }: { labels: CartLabels }) {
  const items         = useCart(s => s.items);
  const coupon_code   = useCart(s => s.coupon_code);
  const mengeAendern  = useCart(s => s.mengeAendern);
  const entfernen     = useCart(s => s.entfernen);
  const setCouponCode = useCart(s => s.setCouponCode);
  const router        = useRouter();

  const [hydrated, setHydrated] = useState(false);
  const [couponInput, setCouponInput] = useState(coupon_code ?? "");
  const [couponPending, setCouponPending] = useState(false);
  const [couponFehler,  setCouponFehler]  = useState<string | null>(null);
  const [rabattCents,   setRabattCents]   = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  // Live-Berechnung
  const berechnung = useMemo(() => berechneCart({
    items,
    rabatt_cents:  rabattCents,
    versand_cents: 0,
  }), [items, rabattCents]);

  // Coupon einlösen
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
        }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        alert(data.error ?? labels.checkout_fehler);
        setCheckoutLoading(false);
      }
    } catch {
      alert(labels.checkout_fehler);
      setCheckoutLoading(false);
    }
  };

  if (!hydrated) {
    return <div className="text-center py-16 text-vintage-dust font-sans text-sm">{labels.laedt}</div>;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShoppingBag className="w-14 h-14 text-vintage-sand mb-4" />
        <p className="font-serif text-xl text-vintage-brown mb-2">{labels.leer}</p>
        <p className="text-vintage-dust text-sm font-sans mb-6">{labels.leer_text}</p>
        <Link
          href="/katalog"
          className="inline-flex items-center gap-2 px-6 py-3 bg-vintage-espresso text-vintage-cream font-sans text-xs tracking-widest uppercase hover:bg-vintage-brown transition-colors"
          style={{ borderRadius: "var(--radius-button)" }}
        >
          {labels.zum_katalog} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">

      {/* Items-Liste */}
      <div className="lg:col-span-2 space-y-3">
        {items.map(item => (
          <div
            key={item.produkt_id}
            className="flex gap-4 p-4 bg-vintage-white border border-vintage-sand"
            style={{ borderRadius: "var(--radius-card)" }}
          >
            {/* Bild */}
            <Link
              href={`/katalog/${item.slug}`}
              className="w-20 h-20 flex-shrink-0 bg-vintage-parchment overflow-hidden"
              style={{ borderRadius: "var(--radius-vintage)" }}
            >
              {item.bild_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.bild_url} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-vintage-sand">✦</div>
              )}
            </Link>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <Link href={`/katalog/${item.slug}`} className="font-serif text-vintage-espresso hover:text-vintage-brown transition-colors line-clamp-2">
                {item.name}
              </Link>
              <p className="font-serif text-vintage-gold mt-1">{formatPreis(item.einzelpreis_cents / 100)}</p>

              {/* Mengen-Stepper */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2 border border-vintage-sand bg-vintage-cream" style={{ borderRadius: "var(--radius-vintage)" }}>
                  <button
                    onClick={() => mengeAendern(item.produkt_id, item.menge - 1)}
                    className="p-2 text-vintage-brown hover:bg-vintage-parchment transition-colors disabled:opacity-30"
                    disabled={item.menge <= 1}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="px-3 text-sm font-sans text-vintage-ink min-w-8 text-center">{item.menge}</span>
                  <button
                    onClick={() => mengeAendern(item.produkt_id, item.menge + 1)}
                    disabled={!!item.max_menge && item.menge >= item.max_menge}
                    className="p-2 text-vintage-brown hover:bg-vintage-parchment transition-colors disabled:opacity-30"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <button
                  onClick={() => entfernen(item.produkt_id)}
                  className="p-2 text-vintage-dust hover:text-vintage-burgundy transition-colors"
                  style={{ borderRadius: "var(--radius-vintage)" }}
                  aria-label={labels.entfernen}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Zeilen-Total */}
            <div className="text-right">
              <p className="font-serif text-vintage-espresso">
                {formatPreis(item.einzelpreis_cents * item.menge / 100)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Zusammenfassung */}
      <div className="lg:col-span-1">
        <div
          className="sticky top-20 bg-vintage-white border border-vintage-sand p-6 space-y-4"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <h2 className="font-serif text-lg text-vintage-espresso border-b border-vintage-sand/50 pb-3">
            {labels.zusammenfassung}
          </h2>

          {/* Coupon */}
          <div>
            {rabattCents > 0 ? (
              <div className="flex items-center justify-between p-3 bg-vintage-sage/10 border border-vintage-sage/30" style={{ borderRadius: "var(--radius-vintage)" }}>
                <span className="flex items-center gap-2 text-xs font-sans text-vintage-forest">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {labels.code_aktiv}: <strong>{coupon_code}</strong>
                </span>
                <button onClick={handleCouponEntfernen} className="text-vintage-dust hover:text-vintage-burgundy">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <label className="text-xs font-sans uppercase tracking-widest text-vintage-brown mb-1.5 block">
                  {labels.coupon}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-vintage-dust" />
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder={labels.code_eingeben}
                      className="w-full pl-9 pr-3 py-2 bg-vintage-cream border border-vintage-sand text-sm font-mono text-vintage-ink focus:outline-none focus:border-vintage-brown transition-colors"
                      style={{ borderRadius: "var(--radius-vintage)" }}
                    />
                  </div>
                  <button
                    onClick={handleCouponEinloesen}
                    disabled={!couponInput || couponPending}
                    className="px-4 py-2 bg-vintage-espresso text-vintage-cream text-xs font-sans uppercase tracking-widest hover:bg-vintage-brown transition-colors disabled:opacity-50"
                    style={{ borderRadius: "var(--radius-button)" }}
                  >
                    {couponPending ? "..." : "OK"}
                  </button>
                </div>
                {couponFehler && (
                  <p className="text-xs text-vintage-burgundy font-sans mt-1">{couponFehler}</p>
                )}
              </>
            )}
          </div>

          {/* Summe */}
          <div className="space-y-2 text-sm font-sans border-t border-vintage-sand/50 pt-4">
            <div className="flex justify-between text-vintage-dust">
              <span>{labels.zwischensumme}</span>
              <span>{formatPreis(berechnung.subtotal_cents / 100)}</span>
            </div>
            {berechnung.rabatt_cents > 0 && (
              <div className="flex justify-between text-vintage-sage">
                <span>{labels.rabatt}</span>
                <span>− {formatPreis(berechnung.rabatt_cents / 100)}</span>
              </div>
            )}
            <div className="flex justify-between text-vintage-dust">
              <span>{labels.versand}</span>
              <span>{labels.versand_calc}</span>
            </div>
            <div className="flex justify-between text-vintage-dust text-xs">
              <span>{labels.inkl_ust}</span>
              <span>{formatPreis(berechnung.tax_total_cents / 100)}</span>
            </div>
            <div className="flex justify-between text-vintage-espresso font-serif text-xl pt-3 border-t border-vintage-sand">
              <span>{labels.summe}</span>
              <span>{formatPreis(berechnung.total_cents / 100)}</span>
            </div>
          </div>

          {/* Checkout */}
          <button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-vintage-gold text-vintage-espresso font-sans text-xs tracking-widest uppercase hover:bg-vintage-copper transition-colors disabled:opacity-60"
            style={{ borderRadius: "var(--radius-button)" }}
          >
            {checkoutLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> {labels.laedt}</>
              : <>{labels.zur_kasse} <ArrowRight className="w-4 h-4" /></>
            }
          </button>

          <p className="text-xs text-vintage-dust font-sans text-center">
            {labels.sichere_zahlung}
          </p>
        </div>
      </div>
    </div>
  );
}
