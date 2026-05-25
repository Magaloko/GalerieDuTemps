"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Check, Loader2 } from "lucide-react";
import { useCart } from "@/lib/cart";

interface Props {
  produktId:         string;
  slug:              string;
  name:              string;
  bildUrl:           string | null;
  preisCents:        number;
  taxRate?:          number;
  taxExempt?:        boolean;
  istSeminar?:       boolean;
  lagerbestand:      number;
  verkauft?:         boolean;
}

export function AddToCartButton({
  produktId, slug, name, bildUrl, preisCents,
  taxRate = 19, taxExempt = false, istSeminar = false,
  lagerbestand, verkauft = false,
}: Props) {
  const hinzufuegen = useCart(s => s.hinzufuegen);
  const router      = useRouter();
  const [hinzugefuegt, setHinzugefuegt] = useState(false);
  const [loading, setLoading] = useState(false);

  if (verkauft || lagerbestand <= 0) {
    return (
      <button
        disabled
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-vintage-dust/30 text-vintage-dust font-sans text-xs tracking-widest uppercase cursor-not-allowed"
        style={{ borderRadius: "var(--radius-button)" }}
      >
        {verkauft ? "Уже продано" : "Нет в наличии"}
      </button>
    );
  }

  const handleClick = () => {
    setLoading(true);
    hinzufuegen({
      produkt_id:        produktId,
      slug,
      name,
      bild_url:          bildUrl,
      einzelpreis_cents: preisCents,
      tax_rate:          taxRate,
      tax_exempt:        taxExempt,
      ist_seminar:       istSeminar,
      max_menge:         lagerbestand,
    });
    setHinzugefuegt(true);
    setLoading(false);
    setTimeout(() => setHinzugefuegt(false), 2500);
  };

  return (
    <div className="flex gap-2 w-full">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 font-sans text-xs tracking-widest uppercase transition-colors disabled:opacity-50 ${
          hinzugefuegt
            ? "bg-vintage-sage text-white"
            : "bg-vintage-espresso text-vintage-cream hover:bg-vintage-brown"
        }`}
        style={{ borderRadius: "var(--radius-button)" }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" />
          : hinzugefuegt ? <><Check className="w-4 h-4" /> Добавлено!</>
          : <><ShoppingBag className="w-4 h-4" /> В корзину</>
        }
      </button>
      {hinzugefuegt && (
        <button
          onClick={() => router.push("/warenkorb")}
          className="px-5 py-3 border border-vintage-sand text-vintage-brown font-sans text-xs tracking-widest uppercase hover:bg-vintage-parchment transition-colors"
          style={{ borderRadius: "var(--radius-button)" }}
        >
          К корзине
        </button>
      )}
    </div>
  );
}
