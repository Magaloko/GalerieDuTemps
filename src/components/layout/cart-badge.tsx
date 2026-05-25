"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useState, useEffect } from "react";

export function CartBadge() {
  const anzahl = useCart(s => s.anzahlArtikel());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  return (
    <Link
      href="/warenkorb"
      className="relative p-2 text-vintage-dust hover:text-vintage-espresso hover:bg-vintage-parchment transition-colors"
      style={{ borderRadius: "var(--radius-card)" }}
      aria-label={`Warenkorb (${anzahl})`}
    >
      <ShoppingBag className="w-5 h-5" />
      {hydrated && anzahl > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-vintage-espresso text-vintage-gold text-[10px] font-sans font-semibold flex items-center justify-center"
          style={{ borderRadius: "999px" }}
        >
          {anzahl > 99 ? "99+" : anzahl}
        </span>
      )}
    </Link>
  );
}
