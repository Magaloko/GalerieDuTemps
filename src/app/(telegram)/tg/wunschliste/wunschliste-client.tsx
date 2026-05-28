"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Heart, Loader2, ShoppingBag, MessageCircle } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatPreis } from "@/lib/utils/preis";
import { confettiBurst, haptic } from "../fx";
import type { ProduktListItem } from "@/types/produkt";

/* ──────────────────────────────────────────────────────────────────────────
 * Mini-App Wishlist-Client
 *
 * Fixes vs. v1:
 *  - Optimistisches Remove (Karte verschwindet sofort, Rollback bei Fehler)
 *  - „В корзину" navigiert nach /tg/cart (mit confetti + haptic)
 *  - Originalpreis als durchgestrichener Preis angezeigt
 * ────────────────────────────────────────────────────────────────────────── */
export function WunschlisteClient() {
  const router = useRouter();
  const [items,       setItems]       = useState<ProduktListItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [busy,        setBusy]        = useState<string | null>(null);
  const [kaufenAktiv, setKaufenAktiv] = useState(true);
  const hinzufuegen = useCart(s => s.hinzufuegen);

  useEffect(() => {
    let aborted = false;
    fetch("/api/wunschliste", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (aborted) return;
        if (Array.isArray(d.produkte)) setItems(d.produkte);
        if (typeof d.kaufenAktiv === "boolean") setKaufenAktiv(d.kaufenAktiv);
      })
      .catch(() => {})
      .finally(() => { if (!aborted) setLoading(false); });
    return () => { aborted = true; };
  }, []);

  // Optimistisch: Karte sofort entfernen, API im Hintergrund, Rollback bei Fehler.
  const entfernen = (produktId: string) => {
    const vorher = items;
    setItems(prev => prev.filter(p => p.id !== produktId));
    setBusy(produktId);
    haptic("soft");
    fetch("/api/wunschliste", {
      method:      "DELETE",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify({ produkt_id: produktId }),
      credentials: "include",
    }).catch(() => {
      setItems(vorher); // Rollback
    }).finally(() => setBusy(null));
  };

  const addToCart = (p: ProduktListItem) => {
    hinzufuegen({
      produkt_id:        p.id,
      slug:              p.slug,
      name:              p.name,
      bild_url:          p.hauptbild_url ?? null,
      einzelpreis_cents: Math.round(Number(p.preis) * 100),
      tax_rate:          12,
      tax_exempt:        false,
      ist_seminar:       false,
      max_menge:         p.lagerbestand,
    });
    confettiBurst(window.innerWidth / 2, window.innerHeight / 2);
    haptic("success");
    setTimeout(() => router.push("/tg/cart"), 350);
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--color-ink-mute)" }} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <main className="p-6 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <Heart className="w-10 h-10 mb-3" style={{ color: "var(--color-ink-mute)" }} />
        <p className="text-[10px] uppercase font-medium mb-2"
          style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}>
          Избранное · 0
        </p>
        <h1 className="mb-2"
          style={{ fontFamily: "var(--font-display)", fontSize: 24,
            color: "var(--tg-theme-text-color, var(--color-ink))" }}>
          Пока пусто
        </h1>
        <p className="text-sm max-w-xs mb-5"
          style={{ fontFamily: "var(--font-italic)", fontStyle: "italic",
            color: "var(--tg-theme-hint-color, var(--color-ink-soft))" }}>
          Сохраняйте находки в избранное, чтобы вернуться позже.
        </p>
        <Link href="/tg" className="text-[12px] uppercase font-medium"
          style={{ letterSpacing: "0.22em", color: "var(--tg-theme-link-color, var(--color-coral))" }}>
          В каталог →
        </Link>
      </main>
    );
  }

  return (
    <main className="p-4">
      <header className="mb-5">
        <p className="text-[10px] uppercase font-medium mb-1"
          style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}>
          ✦ Избранное
        </p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24,
          color: "var(--tg-theme-text-color, var(--color-ink))", lineHeight: 1.1 }}>
          Сохранено
        </h1>
        <p className="mt-1 text-xs"
          style={{ fontFamily: "var(--font-italic)", fontStyle: "italic",
            color: "var(--tg-theme-hint-color, var(--color-ink-soft))" }}>
          {items.length} {plural(items.length)}
        </p>
      </header>

      <ul className="grid grid-cols-2 gap-3">
        {items.map(p => {
          const w = (p.waehrung as "KZT"|"EUR"|"USD"|"RUB"|undefined) ?? "KZT";
          const nichtVerfuegbar = p.verkauft || p.lagerbestand === 0 || !!p.reserviert;
          const statusLabel = p.verkauft ? "Продано" : p.reserviert ? "Зарезервировано" : "Нет в наличии";

          return (
            <li key={p.id} className="flex flex-col"
              style={{ background: "var(--tg-theme-section-bg-color, #fff)",
                border: "1px solid var(--color-line)", opacity: busy === p.id ? 0.5 : 1,
                transition: "opacity 150ms" }}>

              {/* Bild */}
              <Link href={`/tg/produkt/${p.slug}`} className="block relative"
                style={{ aspectRatio: "4/5", background: "var(--color-paper-warm, #f5f0e8)" }}>
                {p.hauptbild_url && (
                  <Image src={p.hauptbild_url} alt={p.name} fill
                    sizes="(max-width:768px) 50vw, 200px" className="object-cover" />
                )}
                {/* Status-Badge */}
                {(p.verkauft || p.reserviert) && (
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[9px] uppercase font-medium"
                    style={{ letterSpacing: "0.14em",
                      background: p.verkauft ? "rgba(15,20,48,0.82)" : "rgba(201,168,76,0.92)",
                      color:      p.verkauft ? "var(--color-gold, #C9A84C)" : "#1a1410",
                      backdropFilter: "blur(4px)" }}>
                    {p.verkauft ? "Продано" : "Зарезервировано"}
                  </span>
                )}
                {/* Heart-Remove */}
                <button type="button"
                  onClick={(e) => { e.preventDefault(); entfernen(p.id); }}
                  disabled={busy === p.id}
                  className="absolute top-1.5 right-1.5 p-1.5 disabled:opacity-50"
                  style={{ background: "rgba(255,255,255,0.9)", borderRadius: "999px",
                    color: "var(--color-coral)", touchAction: "manipulation" }}
                  aria-label="Убрать из избранного">
                  <Heart className="w-3.5 h-3.5" fill="currentColor" />
                </button>
              </Link>

              {/* Info */}
              <div className="p-2.5 flex-1 flex flex-col gap-1">
                <Link href={`/tg/produkt/${p.slug}`} className="line-clamp-2"
                  style={{ fontFamily: "var(--font-display)", fontSize: 13, lineHeight: 1.15,
                    color: "var(--tg-theme-text-color, var(--color-ink))" }}>
                  {p.name}
                </Link>

                {/* Preis + Originalpreis */}
                <div className="flex items-baseline gap-2 mt-auto">
                  <p style={{ fontFamily: "var(--font-display)", fontSize: 14,
                    color:          p.verkauft ? "var(--color-ink-mute)" : "var(--tg-theme-text-color, var(--color-ink))",
                    textDecoration: p.verkauft ? "line-through" : undefined }}>
                    {formatPreis(Number(p.preis), w, true)}
                  </p>
                  {p.originalpreis && !p.verkauft && (
                    <p className="text-[11px] line-through" style={{ color: "var(--color-ink-mute)" }}>
                      {formatPreis(Number(p.originalpreis), w, true)}
                    </p>
                  )}
                </div>

                {/* Aktion */}
                {kaufenAktiv ? (
                  nichtVerfuegbar ? (
                    <span className="mt-1 flex items-center justify-center py-1.5 text-[10px] uppercase font-medium opacity-50"
                      style={{ letterSpacing: "0.16em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
                      {statusLabel}
                    </span>
                  ) : (
                    <button type="button" onClick={() => addToCart(p)}
                      className="mt-1 flex items-center justify-center gap-1 py-1.5 text-[11px] uppercase font-medium"
                      style={{ letterSpacing: "0.18em", background: "var(--color-coral)",
                        color: "#fff", touchAction: "manipulation" }}>
                      <ShoppingBag className="w-3 h-3" />
                      В корзину
                    </button>
                  )
                ) : (
                  nichtVerfuegbar ? (
                    <span className="mt-1 flex items-center justify-center py-1.5 text-[10px] uppercase font-medium opacity-50"
                      style={{ letterSpacing: "0.16em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
                      {statusLabel}
                    </span>
                  ) : (
                    <Link href={`/tg/kontakt?produkt=${p.id}&slug=${p.slug}&name=${encodeURIComponent(p.name)}`}
                      className="mt-1 flex items-center justify-center gap-1 py-1.5 text-[11px] uppercase font-medium"
                      style={{ letterSpacing: "0.18em", background: "var(--tg-theme-section-bg-color, #fff)",
                        border: "1px solid var(--color-coral)", color: "var(--color-coral)",
                        touchAction: "manipulation" }}>
                      <MessageCircle className="w-3 h-3" />
                      Запросить
                    </Link>
                  )
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function plural(n: number): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "предмет";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "предмета";
  return "предметов";
}
