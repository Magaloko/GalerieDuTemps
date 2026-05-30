"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, Sparkles, Loader2, Trash2, ShoppingBag, MessageCircle,
} from "lucide-react";
import { ProduktKarte } from "@/components/produkte/produkt-karte";
import { PushSubscribeCustomer } from "@/components/push/push-subscribe-customer";
import { useWunschliste } from "@/hooks/use-wunschliste";
import { useCart } from "@/lib/cart";
import { formatPreis } from "@/lib/utils/preis";
import type { ProduktListItem } from "@/types/produkt";

/* ──────────────────────────────────────────────────────────────────────────
 * WunschlistePage — Polish-Refresh
 *
 * Vorher: hat NUR die UUIDs angezeigt — komplett nutzlos, User wusste nicht
 * was er da gespeichert hatte (kein Bild, kein Name, kein Preis).
 *
 * Jetzt: lädt aktiv `/api/wunschliste` (gibt full ProduktListItem-Array)
 * und nutzt die existierende <ProduktKarte> für konsistente Catalog-UX.
 *
 * Zusätzlich:
 *  - Bulk-Bar oben: "В корзину все · ₸X · N шт"
 *  - "Очистить всё" am Footer
 *  - Loading-Skeleton statt blanker Page beim First-Mount
 * ────────────────────────────────────────────────────────────────────────── */
export function WunschlistePage() {
  const { ids, toggle } = useWunschliste();
  const hinzufuegen = useCart(s => s.hinzufuegen);

  const [produkte, setProdukte] = useState<ProduktListItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [bulking,  setBulking]  = useState(false);
  const [kaufenAktiv, setKaufenAktiv] = useState(true);

  // Initial-Load + Sync wenn ids ändern (toggle/remove)
  useEffect(() => {
    let aborted = false;
    setLoading(true);
    fetch("/api/wunschliste")
      .then(r => r.json())
      .then(d => {
        if (aborted) return;
        if (Array.isArray(d.produkte)) setProdukte(d.produkte);
        if (typeof d.kaufenAktiv === "boolean") setKaufenAktiv(d.kaufenAktiv);
      })
      .catch(() => {})
      .finally(() => { if (!aborted) setLoading(false); });
    return () => { aborted = true; };
  }, [ids.length]); // re-fetch wenn user etwas entfernt

  // Liste der noch verfügbaren Items für Bulk-Add (sold-out raus).
  // Im Schaufenster-Modus gibt es keinen Bulk-Add → leer.
  const kaufbar = kaufenAktiv
    ? produkte.filter(p => !p.verkauft && p.lagerbestand > 0)
    : [];
  const summeKaufbarCents = kaufbar.reduce(
    (acc, p) => acc + Math.round(Number(p.preis) * 100),
    0,
  );

  const handleBulkAdd = () => {
    setBulking(true);
    for (const p of kaufbar) {
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
    }
    // kurzes optisches Feedback, dann zur Cart-Page
    setTimeout(() => {
      window.location.href = "/warenkorb";
    }, 250);
  };

  const handleClearAll = async () => {
    if (!confirm("Удалить все товары из избранного?")) return;
    for (const id of ids) {
      await toggle(id);
    }
  };

  /* ── Loading-Skeleton ──────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ background: "var(--color-paper)" }} className="min-h-[60vh]">
        <div className="max-w-[1100px] mx-auto px-6 md:px-14 py-14 md:py-20">
          <div className="flex items-center gap-3" style={{ color: "var(--color-ink-mute)" }}>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span
              className="text-[11px] uppercase font-medium"
              style={{ letterSpacing: "0.22em" }}
            >
              Загружаем избранное…
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* ── Empty-State ──────────────────────────────────────── */
  if (produkte.length === 0) {
    return <EmptyState />;
  }

  /* ── Mit Items ─────────────────────────────────────────── */
  const count = produkte.length;
  return (
    <div
      style={{ background: "var(--color-paper)", color: "var(--color-ink)" }}
      className="min-h-screen pb-32 md:pb-16"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-14 py-10 md:py-14">

        {/* ─── Header ──────────────────────────────────────── */}
        <header
          className="pb-6 mb-8 flex items-end justify-between gap-4 flex-wrap"
          style={{ borderBottom: "1px solid var(--color-line)" }}
        >
          <div>
            <p
              className="text-[11px] uppercase font-medium mb-3"
              style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
            >
              ✦ Избранное · {count} {pluralPredmet(count)}
            </p>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize:   "clamp(2rem, 5vw, 3rem)",
                color:      "var(--color-ink)",
                lineHeight: 1.05,
              }}
            >
              Моё{" "}
              <em
                style={{
                  fontFamily: "var(--font-italic)",
                  fontStyle:  "italic",
                  color:      "var(--color-coral)",
                }}
              >
                избранное.
              </em>
            </h1>
          </div>

          {/* Clear-All */}
          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center gap-1.5 text-[11px] uppercase font-medium transition-colors hover:text-[var(--color-coral-deep,#A53E26)]"
            style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
          >
            <Trash2 className="w-3 h-3" /> Очистить
          </button>
        </header>

        {/* ─── Bulk-Bar (desktop sticky) ────────────────────── */}
        {kaufbar.length > 0 && (
          <div
            className="hidden md:flex items-center justify-between gap-4 p-4 mb-8 sticky top-24 z-20"
            style={{
              background: "#fff",
              border:     "1px solid var(--color-line)",
              borderLeft: "3px solid var(--color-coral)",
            }}
          >
            <div className="min-w-0">
              <p
                className="text-[10px] uppercase font-medium"
                style={{ letterSpacing: "0.22em", color: "var(--color-ink-soft)" }}
              >
                В наличии {kaufbar.length} из {count}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize:   20,
                  color:      "var(--color-ink)",
                  lineHeight: 1.1,
                }}
              >
                {formatPreis(summeKaufbarCents / 100)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleBulkAdd}
              disabled={bulking}
              className="btn-coral btn-coral-sm inline-flex items-center gap-2 shrink-0"
              style={{ minHeight: 44 }}
            >
              {bulking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
              {bulking ? "Добавляем…" : "Добавить все в корзину"}
              {!bulking && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* ─── Push-Abo «Уведомлять о новинках» (dezent) ──── */}
        <div className="mb-8">
          <PushSubscribeCustomer />
        </div>

        {/* ─── Produkt-Grid ────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
          {produkte.map(p => (
            <ProduktKarte key={p.id} produkt={p} />
          ))}
        </div>

        {/* ─── Footer-CTA ──────────────────────────────────── */}
        <div
          className="mt-12 pt-6 flex flex-wrap items-center justify-between gap-4"
          style={{ borderTop: "1px solid var(--color-line)" }}
        >
          <Link
            href="/katalog"
            className="text-[11px] uppercase font-medium inline-flex items-center gap-2 transition-colors hover:text-[var(--color-coral)]"
            style={{ letterSpacing: "0.22em", color: "var(--color-ink)" }}
          >
            ← Продолжить покупки
          </Link>
          <Link
            href="/kontakt"
            className="btn-coral btn-coral-ghost inline-flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" /> Запрос куратору
          </Link>
        </div>
      </div>

      {/* ─── Mobile Sticky Bulk-Bar ──────────────────────── */}
      {kaufbar.length > 0 && (
        <div
          className="md:hidden fixed inset-x-0 z-50 px-4 py-3 bottom-above-tabbar"
          style={{
            // bottom via .bottom-above-tabbar (über der MobileTabBar).
            background:    "rgba(245, 241, 234, 0.96)",
            borderTop:     "1px solid var(--color-line)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p
                className="text-[10px] uppercase font-medium"
                style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
              >
                {kaufbar.length} {pluralPredmet(kaufbar.length)}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize:   18,
                  color:      "var(--color-ink)",
                  lineHeight: 1,
                }}
              >
                {formatPreis(summeKaufbarCents / 100)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleBulkAdd}
              disabled={bulking}
              className="btn-coral btn-coral-sm inline-flex items-center gap-1.5 shrink-0"
              style={{ minHeight: 44 }}
            >
              {bulking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
              {bulking ? "..." : "В корзину"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Empty-State (2-col Hero + Curated-Tease) ─────────────────────────── */
function EmptyState() {
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
            ✦ Избранное · 0
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
            <em
              style={{
                fontFamily: "var(--font-italic)",
                fontStyle:  "italic",
                color:      "var(--color-coral)",
              }}
            >
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
              <Link key={i} href="/katalog" className="block group">
                <div
                  className="relative overflow-hidden"
                  style={{
                    aspectRatio: "4/5",
                    background:
                      tone === "velvet" ? "linear-gradient(135deg,#705566 0%,#523F4D 50%,#352730 100%)"
                      : tone === "clay" ? "linear-gradient(135deg,#B07659 0%,#8C5B40 50%,#623E29 100%)"
                      : tone === "jade" ? "linear-gradient(135deg,#7A938C 0%,#566F69 50%,#384E48 100%)"
                      :                   "linear-gradient(135deg,#8D8B5A 0%,#6F6D43 50%,#4D4C2B 100%)",
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

/* ── Russian plural helper for "предмет" ──────────────────────────────── */
function pluralPredmet(n: number): string {
  const mod10  = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "предмет";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "предмета";
  return "предметов";
}
