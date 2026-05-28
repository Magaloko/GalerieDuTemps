"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Loader2, ShoppingBag, MessageCircle } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatPreis } from "@/lib/utils/preis";
import type { ProduktListItem } from "@/types/produkt";

/* ──────────────────────────────────────────────────────────────────────────
 * Mini-App Wishlist-Client
 *
 * Spiegelt die Web-/wunschliste-Logic in Telegram-WebView-Optik:
 *  - 2-Spalten-Grid (compact für 360–414px Telegram-WebView)
 *  - Heart-Toggle entfernt direkt aus der Liste
 *  - „В корзину" pro Item — kein bulk-add weil Mini-App-Mehrwert ist
 *    schnelle Single-Item-Aktionen (Tap → Cart → MainButton zahlt)
 *  - Tab-Bar visible (padding-bottom 24)
 * ────────────────────────────────────────────────────────────────────────── */
export function WunschlisteClient() {
  const [items,   setItems]   = useState<ProduktListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy,    setBusy]    = useState<string | null>(null);
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

  const entfernen = async (produktId: string) => {
    setBusy(produktId);
    try {
      await fetch("/api/wunschliste", {
        method:      "DELETE",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({ produkt_id: produktId }),
        credentials: "include",
      });
      setItems(prev => prev.filter(p => p.id !== produktId));
    } catch {}
    finally { setBusy(null); }
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
    // Haptic Feedback wenn verfügbar
    const tg = window.Telegram?.WebApp as unknown as {
      HapticFeedback?: { notificationOccurred: (s: string) => void };
    } | undefined;
    try { tg?.HapticFeedback?.notificationOccurred("success"); } catch {}
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
        <p
          className="text-[10px] uppercase font-medium mb-2"
          style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
        >
          Избранное · 0
        </p>
        <h1
          className="mb-2"
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   24,
            color:      "var(--tg-theme-text-color, var(--color-ink))",
          }}
        >
          Пока пусто
        </h1>
        <p
          className="text-sm max-w-xs mb-5"
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--tg-theme-hint-color, var(--color-ink-soft))",
          }}
        >
          Сохраняйте находки в избранное, чтобы вернуться позже.
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
      </main>
    );
  }

  return (
    <main className="p-4">
      <header className="mb-5">
        <p
          className="text-[10px] uppercase font-medium mb-1"
          style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
        >
          ✦ Избранное
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   24,
            color:      "var(--tg-theme-text-color, var(--color-ink))",
            lineHeight: 1.1,
          }}
        >
          Сохранено
        </h1>
        <p
          className="mt-1 text-xs"
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--tg-theme-hint-color, var(--color-ink-soft))",
          }}
        >
          {items.length} {plural(items.length)}
        </p>
      </header>

      <ul className="grid grid-cols-2 gap-3">
        {items.map(p => (
          <li
            key={p.id}
            className="flex flex-col"
            style={{
              background: "var(--tg-theme-section-bg-color, #fff)",
              border:     "1px solid var(--color-line)",
            }}
          >
            <Link
              href={`/tg/produkt/${p.slug}`}
              className="block relative"
              style={{ aspectRatio: "4/5", background: "var(--color-paper-warm, #f5f0e8)" }}
            >
              {p.hauptbild_url && (
                <Image
                  src={p.hauptbild_url}
                  alt={p.name}
                  fill
                  sizes="(max-width:768px) 50vw, 200px"
                  className="object-cover"
                />
              )}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); entfernen(p.id); }}
                disabled={busy === p.id}
                className="absolute top-1.5 right-1.5 p-1.5"
                style={{
                  background:   "rgba(255,255,255,0.9)",
                  borderRadius: "999px",
                  color:        "var(--color-coral)",
                  touchAction:  "manipulation",
                }}
                aria-label="Убрать из избранного"
              >
                <Heart className="w-3.5 h-3.5" fill="currentColor" />
              </button>
            </Link>
            <div className="p-2.5 flex-1 flex flex-col gap-1.5">
              <Link
                href={`/tg/produkt/${p.slug}`}
                className="line-clamp-2"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize:   13,
                  lineHeight: 1.15,
                  color:      "var(--tg-theme-text-color, var(--color-ink))",
                }}
              >
                {p.name}
              </Link>
              <p
                className="mt-auto"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize:   14,
                  color:      "var(--tg-theme-text-color, var(--color-ink))",
                }}
              >
                {formatPreis(Number(p.preis))}
              </p>
              {kaufenAktiv ? (
                <button
                  type="button"
                  onClick={() => addToCart(p)}
                  disabled={p.verkauft || p.lagerbestand === 0}
                  className="mt-1 flex items-center justify-center gap-1 py-1.5 text-[11px] uppercase font-medium transition-opacity disabled:opacity-40"
                  style={{
                    letterSpacing: "0.18em",
                    background:    "var(--color-coral)",
                    color:         "#fff",
                    touchAction:   "manipulation",
                  }}
                >
                  <ShoppingBag className="w-3 h-3" />
                  {p.verkauft || p.lagerbestand === 0 ? "Нет в наличии" : "В корзину"}
                </button>
              ) : p.verkauft || p.lagerbestand === 0 ? (
                <span
                  className="mt-1 flex items-center justify-center gap-1 py-1.5 text-[11px] uppercase font-medium opacity-50"
                  style={{ letterSpacing: "0.18em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}
                >
                  Продано
                </span>
              ) : (
                <Link
                  href={`/tg/kontakt?produkt=${p.id}&name=${encodeURIComponent(p.name)}`}
                  className="mt-1 flex items-center justify-center gap-1 py-1.5 text-[11px] uppercase font-medium"
                  style={{
                    letterSpacing: "0.18em",
                    background:    "var(--tg-theme-section-bg-color, #fff)",
                    border:        "1px solid var(--color-coral)",
                    color:         "var(--color-coral)",
                    touchAction:   "manipulation",
                  }}
                >
                  <MessageCircle className="w-3 h-3" />
                  Запросить
                </Link>
              )}
            </div>
          </li>
        ))}
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
