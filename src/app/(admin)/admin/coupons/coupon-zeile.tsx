"use client";

import { useTransition } from "react";
import { Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { couponLoeschenAction, couponToggleAction } from "./actions";
import type { Coupon } from "@/types/commerce";

export function CouponZeile({
  coupon,
  formatPreisFn,
}: {
  coupon: Coupon;
  formatPreisFn: (eur: number) => string;
}) {
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm(`Coupon "${coupon.code}" wirklich löschen?`)) return;
    startTransition(() => couponLoeschenAction(coupon.id));
  };

  const handleToggle = () => {
    startTransition(() => couponToggleAction(coupon.id, !coupon.aktiv));
  };

  return (
    <div
      className={`flex items-center justify-between p-4 border ${coupon.aktiv ? "bg-vintage-white border-vintage-sand" : "bg-vintage-parchment/50 border-vintage-sand/40 opacity-60"} ${pending ? "opacity-50" : ""}`}
      style={{ borderRadius: "var(--radius-card)" }}
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <span className="font-mono text-vintage-gold text-lg tracking-wider">{coupon.code}</span>
        <div className="min-w-0">
          <p className="text-sm font-serif text-vintage-espresso">
            {coupon.typ === "prozent"
              ? `${coupon.wert}%`
              : formatPreisFn(Number(coupon.wert))
            }
            {coupon.beschreibung && <span className="text-vintage-dust text-xs font-sans ml-2">· {coupon.beschreibung}</span>}
          </p>
          <p className="text-xs text-vintage-dust font-sans">
            {coupon.nutzungen_aktuell}/{coupon.nutzungen_max ?? "∞"} genutzt
            {coupon.gueltig_bis && ` · bis ${new Date(coupon.gueltig_bis).toLocaleDateString("de-DE")}`}
            {coupon.nur_b2b && " · nur B2B"}
            {coupon.nur_b2c && " · nur B2C"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={handleToggle}
          disabled={pending}
          className="p-2 text-vintage-brown hover:bg-vintage-parchment transition-colors disabled:opacity-50"
          style={{ borderRadius: "var(--radius-vintage)" }}
          title={coupon.aktiv ? "Deaktivieren" : "Aktivieren"}
        >
          {coupon.aktiv ? <ToggleRight className="w-5 h-5 text-vintage-sage" /> : <ToggleLeft className="w-5 h-5 text-vintage-dust" />}
        </button>
        <button
          onClick={handleDelete}
          disabled={pending}
          className="p-2 text-vintage-dust hover:text-vintage-burgundy transition-colors disabled:opacity-50"
          style={{ borderRadius: "var(--radius-vintage)" }}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
