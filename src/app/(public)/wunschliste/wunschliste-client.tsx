"use client";

import { useWunschliste } from "@/hooks/use-wunschliste";
import Link from "next/link";
import { Heart, ArrowRight, Sparkles } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
 * Wunschliste — Handoff I1 (Empty) bzw. paper-Liste (mit Items).
 *
 * Empty (2-col):
 *  - Links: eyebrow "Wishlist · 0" → display-lg "Пока пусто." → italic Hinweis
 *    → 2 CTAs (catalog solid, quiz ghost).
 *  - Rechts: eyebrow "Возможно вам понравится" + Curated-Grid (placeholder).
 *
 * Mit Items: paper-card-Liste mit Heart-Remove-Button.
 * ────────────────────────────────────────────────────────────────────────── */
export function WunschlistePage() {
  const { ids, toggle } = useWunschliste();
  const count = ids.length;

  if (count === 0) {
    return (
      <div style={{ background: "var(--color-paper)", color: "var(--color-ink)" }}>
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-200px)]">

          {/* Links — Empty-Hero */}
          <div
            className="px-6 md:px-14 py-14 md:py-20 flex flex-col justify-center"
            style={{ borderRight: "1px solid var(--color-line)" }}
          >
            <p
              className="text-[11px] uppercase font-medium mb-6"
              style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
            >
              Wishlist · 0 предметов
            </p>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize:   "clamp(3rem, 8vw, 5rem)",
                lineHeight: 0.98,
                color:      "var(--color-ink)",
              }}
            >
              Пока<br />
              <em className="font-italic" style={{ color: "var(--color-coral)", fontStyle: "italic" }}>
                пусто.
              </em>
            </h1>
            <p
              className="mt-8 max-w-md"
              style={{
                fontFamily: "var(--font-italic)",
                fontStyle:  "italic",
                fontSize:   17,
                lineHeight: 1.7,
                color:      "var(--color-ink-soft)",
              }}
            >
              Сохраняйте понравившиеся вещи, чтобы вернуться к ним позже —
              и получать уведомления, когда куратор найдёт похожее.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link href="/katalog" className="btn-coral btn-coral-lg">
                Открыть каталог <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/quiz" className="btn-coral btn-coral-ghost btn-coral-lg">
                <Sparkles className="w-4 h-4" /> Пройти квиз
              </Link>
            </div>
          </div>

          {/* Rechts — Curated-Tease */}
          <div
            className="px-6 md:px-14 py-14 md:py-20"
            style={{ background: "var(--color-bone)" }}
          >
            <p
              className="text-[11px] uppercase font-medium mb-6"
              style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
            >
              Возможно, вам понравится
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { tone: "velvet", lot: "042" },
                { tone: "clay",   lot: "087" },
                { tone: "jade",   lot: "121" },
                { tone: "olive",  lot: "156" },
              ].map(({ tone, lot }, i) => (
                <Link
                  key={i}
                  href="/katalog"
                  className="block group"
                >
                  <div
                    className="placeholder-stripes relative overflow-hidden"
                    style={{
                      aspectRatio: "4/5",
                      background: tone === "velvet" ? "linear-gradient(135deg,#705566 0%,#523F4D 50%,#352730 100%)"
                                : tone === "clay"   ? "linear-gradient(135deg,#B07659 0%,#8C5B40 50%,#623E29 100%)"
                                : tone === "jade"   ? "linear-gradient(135deg,#7A938C 0%,#566F69 50%,#384E48 100%)"
                                :                     "linear-gradient(135deg,#8D8B5A 0%,#6F6D43 50%,#4D4C2B 100%)",
                    }}
                  >
                    <span
                      className="absolute bottom-2 right-2 text-[9px] uppercase"
                      style={{
                        fontFamily:    "var(--font-mono)",
                        letterSpacing: "0.18em",
                        color:         "rgba(255,255,255,0.7)",
                      }}
                    >
                      LOT {lot}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--color-paper)", color: "var(--color-ink)" }}>
      <div className="max-w-[1100px] mx-auto px-6 md:px-14 py-14 md:py-20">

        <header className="pb-6 mb-10" style={{ borderBottom: "1px solid var(--color-line)" }}>
          <p
            className="text-[11px] uppercase font-medium mb-3"
            style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
          >
            Wishlist · {count} {count === 1 ? "предмет" : "предметов"}
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   "clamp(2.5rem, 6vw, 3.5rem)",
              color:      "var(--color-ink)",
            }}
          >
            Моё <em className="font-italic" style={{ color: "var(--color-coral)", fontStyle: "italic" }}>избранное.</em>
          </h1>
        </header>

        <p
          className="text-[12px] uppercase font-medium mb-6"
          style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
        >
          Сохраняется в этом браузере.
        </p>

        <div className="space-y-3">
          {ids.map(id => (
            <WunschlistenItem key={id} produktId={id} onEntfernen={() => toggle(id)} />
          ))}
        </div>

        <div className="mt-10 pt-6 flex flex-wrap items-center justify-between gap-4" style={{ borderTop: "1px solid var(--color-line)" }}>
          <Link
            href="/katalog"
            className="text-[11px] uppercase font-medium inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
            style={{ letterSpacing: "0.22em", color: "var(--color-ink)" }}
          >
            Продолжить покупки <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/kontakt" className="btn-coral">
            Запрос куратору <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function WunschlistenItem({
  produktId,
  onEntfernen,
}: {
  produktId:   string;
  onEntfernen: () => void;
}) {
  return (
    <div
      className="flex items-center gap-4 p-4"
      style={{ background: "var(--color-bone)", border: "1px solid var(--color-line)" }}
    >
      <div
        className="w-14 h-14 flex-shrink-0 flex items-center justify-center"
        style={{ background: "var(--color-paper-warm)" }}
      >
        <Heart className="w-5 h-5" style={{ color: "var(--color-ink-mute)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-[10px] uppercase font-medium mb-0.5"
          style={{ letterSpacing: "0.22em", color: "var(--color-coral)" }}
        >
          Лот {produktId.slice(0, 8)}
        </p>
        <p
          className="text-sm"
          style={{ fontFamily: "var(--font-italic)", fontStyle: "italic", color: "var(--color-ink)" }}
        >
          Товар сохранён
        </p>
      </div>
      <button
        onClick={onEntfernen}
        className="p-2 transition-opacity hover:opacity-70"
        aria-label="Убрать из избранного"
      >
        <Heart className="w-4 h-4" style={{ color: "var(--color-coral)", fill: "var(--color-coral)" }} />
      </button>
    </div>
  );
}
