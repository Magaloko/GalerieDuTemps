"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Sparkles, Star } from "lucide-react";
import { useWunschliste } from "@/hooks/use-wunschliste";
import { formatPreis, rabattProzent } from "@/lib/utils/preis";
import type { ProduktListItem, Zustand } from "@/types/produkt";

/* ──────────────────────────────────────────────────────────────────────────
 * ProduktKarte — Catalog Card v2 (Welle 1 Polish)
 *
 * Neue Features ggü. v1 (inspired by reference vintage-market):
 *  - Gold-Corners (4 dezente Eck-Marker für Antik-Look)
 *  - Gold-Divider (◆ zwischen Bild und Content)
 *  - Status-Badges (Sold / Новинка <7 Tage / Топ)
 *  - KeyDetail-Tag (Material/Era prominent bottom-left auf dem Bild)
 *  - ConditionDot (farbiger Punkt + Label, mapped zu sebo-Zuständen)
 *  - ImageCountDots (rechts unten, wenn mehr als 1 Bild vorhanden)
 *  - Hover-Specs-Overlay (Material · Era · Herkunft fade-in)
 *  - Saubere "Без фото" Placeholder mit Sparkles statt streaky gradient
 * ────────────────────────────────────────────────────────────────────────── */

const ZUSTAND_INFO: Record<Zustand, { label: string; color: string }> = {
  sehr_gut:    { label: "Отличное",       color: "#7A8B6F" }, // sage
  gut:         { label: "Хорошее",        color: "#B08D57" }, // gold
  akzeptabel:  { label: "Приемлемое",     color: "#C9956B" }, // amber
  restauriert: { label: "Реставрировано", color: "#8B6F47" }, // brown
};

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

interface ProduktKarteProps {
  produkt:   ProduktListItem;
  priority?: boolean;
}

export function ProduktKarte({ produkt, priority = false }: ProduktKarteProps) {
  const { toggle, istGemerkt, isLoading } = useWunschliste();

  // Bild-Fallback: tote URL / fehlende Datei → sauberer „Без фото"-Placeholder
  // statt Broken-Image. onError fängt Laufzeitfehler; der Mount-Check (ref)
  // fängt SSR-Fehler vor der Hydration ab (relevant für priority/eager-Bilder).
  const [bildFehler, setBildFehler] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setBildFehler(true);
  }, []);

  const gemerkt    = istGemerkt(produkt.id);
  const rabatt     = produkt.originalpreis ? rabattProzent(produkt.preis, produkt.originalpreis) : 0;
  const waehrung   = (produkt.waehrung as "KZT" | "EUR" | "USD" | "RUB" | undefined) ?? "KZT";
  const isNew      = !produkt.verkauft && produkt.erstellt_am
    ? (Date.now() - new Date(produkt.erstellt_am).getTime()) < SEVEN_DAYS
    : false;
  const ausverkauft = produkt.lagerbestand === 0 && !produkt.verkauft;
  const zustandInfo = ZUSTAND_INFO[produkt.zustand];

  // KeyDetail-Tag: prominent unten links auf dem Bild
  // Material > Era > Herkunft als Priorität
  const keyDetail = produkt.material || produkt.era || produkt.herkunft || null;

  // Hover-Specs: alle verfügbaren chunked mit ·
  const hoverSpecs = [produkt.material, produkt.era, produkt.herkunft]
    .filter((x): x is string => Boolean(x));

  return (
    <article className="group relative">
      {/* Gold-Corners — dezente Antik-Eck-Marker */}
      <GoldCorners />

      {/* ────────── Bild ────────── */}
      <Link
        href={`/katalog/${produkt.slug}`}
        className="block relative overflow-hidden"
        style={{
          aspectRatio: "4/5",
          background:  "var(--color-paper-warm)",
        }}
      >
        {produkt.hauptbild_url && !bildFehler ? (
          <Image
            ref={imgRef}
            src={produkt.hauptbild_url}
            alt={produkt.name}
            fill
            sizes="(max-width:640px) 50vw, (max-width:1280px) 33vw, 25vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            priority={priority}
            onError={() => setBildFehler(true)}
          />
        ) : (
          <ImagePlaceholder name={produkt.name} />
        )}

        {/* Hover-Vignette von unten — verstärkt KeyDetail + HoverSpecs lesbarkeit */}
        <div
          className="absolute inset-0 transition-opacity duration-500 opacity-0 group-hover:opacity-100 pointer-events-none"
          style={{
            background: "linear-gradient(to top, rgba(15,20,48,0.55), transparent 55%)",
          }}
        />

        {/* ── Badges TOP-LEFT ─────────────────────────── */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {produkt.verkauft ? (
            <StatusBadge label="Продано" tone="muted" />
          ) : produkt.reserviert ? (
            <StatusBadge label="Зарезервировано" tone="gold" />
          ) : ausverkauft ? (
            <StatusBadge label="Нет в наличии" tone="warning" />
          ) : isNew ? (
            <StatusBadge label="Новинка" tone="gold" />
          ) : null}
          {rabatt > 0 && !produkt.verkauft && (
            <span
              className="px-2 py-0.5 text-[10px] uppercase font-medium"
              style={{
                background:    "var(--color-coral)",
                color:         "#fff",
                letterSpacing: "0.18em",
              }}
            >
              −{rabatt}%
            </span>
          )}
        </div>

        {/* ── Featured-Badge TOP-RIGHT ─────────────────── */}
        {produkt.featured && !produkt.verkauft && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-0.5 transition-all duration-300"
            style={{
              background:    "rgba(15,20,48,0.88)",
              color:         "var(--color-coral, #E8703A)",
              letterSpacing: "0.18em",
              fontSize:      10,
              fontWeight:    500,
              textTransform: "uppercase",
            }}
          >
            <Star className="w-2.5 h-2.5" fill="currentColor" />
            Топ
          </div>
        )}

        {/* ── Wunschliste-Button — fade-in on hover ────── */}
        <button
          onClick={(e) => { e.preventDefault(); toggle(produkt.id); }}
          disabled={isLoading}
          className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center transition-all duration-300 disabled:opacity-50"
          style={{
            background:    "rgba(245, 241, 234, 0.92)",
            backdropFilter:"blur(6px)",
            borderRadius:  "999px",
            opacity:       gemerkt ? 1 : undefined,
            transform:     "translateY(0)",
            // Wenn featured-Badge da ist, Heart-Button etwas weiter unten
            top:           produkt.featured && !produkt.verkauft ? "2.75rem" : "0.75rem",
          }}
          aria-label={gemerkt ? "Убрать из избранного" : "Добавить в избранное"}
          aria-pressed={gemerkt}
        >
          <Heart
            className="w-4 h-4 transition-colors"
            style={{
              color: gemerkt ? "var(--color-coral)" : "var(--color-ink-soft)",
              fill:  gemerkt ? "var(--color-coral)" : "none",
            }}
          />
        </button>

        {/* ── KeyDetail-Tag BOTTOM-LEFT (Material/Era prominent) ─ */}
        {keyDetail && !produkt.verkauft && (
          <div
            className="absolute bottom-3 left-3 z-10 px-2.5 py-1"
            style={{
              background:     "rgba(15, 20, 48, 0.78)",
              backdropFilter: "blur(4px)",
              color:          "var(--color-coral, #E8703A)",
              letterSpacing:  "0.18em",
              fontSize:       10,
              fontWeight:     500,
              textTransform:  "uppercase",
            }}
          >
            {keyDetail}
          </div>
        )}

        {/* ── ImageCount-Indicator BOTTOM-RIGHT ────────── */}
        {produkt.bilder_count && produkt.bilder_count > 1 && (
          <ImageCountDots count={produkt.bilder_count} />
        )}

        {/* ── Hover-Specs-Overlay — fade-in on hover ──── */}
        {hoverSpecs.length > 0 && (
          <div
            className="absolute bottom-0 left-0 right-0 px-3 py-2.5 flex items-center gap-2 z-10 transition-all duration-500 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 pointer-events-none"
            style={{
              background: "linear-gradient(to top, rgba(15,20,48,0.85), transparent)",
            }}
          >
            <Sparkles className="w-3 h-3 shrink-0" style={{ color: "var(--color-coral, #E8703A)" }} />
            <span className="font-body text-[10px] tracking-wide text-white/90 truncate">
              {hoverSpecs.join(" · ")}
            </span>
          </div>
        )}
      </Link>

      {/* ────────── Gold-Divider ────────── */}
      <GoldDivider />

      {/* ────────── Info ────────── */}
      <div className="pt-3 pb-1 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {produkt.kategorie_name && (
            <p
              className="text-[10px] uppercase font-medium mb-1 truncate"
              style={{ letterSpacing: "0.22em", color: "var(--color-coral)" }}
            >
              {produkt.kategorie_name}
            </p>
          )}
          <Link href={`/katalog/${produkt.slug}`}>
            <h3
              className="leading-tight transition-colors duration-300 line-clamp-2 group-hover:text-[var(--color-coral)]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize:   20,
                color:      "var(--color-ink)",
              }}
            >
              {produkt.name}
            </h3>
          </Link>
        </div>

        {/* Price */}
        <div className="text-right shrink-0">
          {produkt.b2c_mode === "teaser" ? (
            <Link
              href="/kunde/registrieren?tab=business"
              className="text-[11px] uppercase font-medium"
              style={{ letterSpacing: "0.22em", color: "var(--color-coral)" }}
            >
              Pro →
            </Link>
          ) : (
            <>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize:   20,
                  color:      produkt.verkauft ? "var(--color-ink-mute)" : "var(--color-ink)",
                  lineHeight: 1,
                  textDecoration: produkt.verkauft ? "line-through" : undefined,
                }}
              >
                {formatPreis(produkt.preis, waehrung)}
              </p>
              {produkt.originalpreis && !produkt.verkauft && (
                <p
                  className="text-[11px] line-through mt-0.5"
                  style={{ color: "var(--color-ink-mute)" }}
                >
                  {formatPreis(produkt.originalpreis, waehrung)}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Condition + Era im Footer ──────────── */}
      {(zustandInfo || produkt.era) && (
        <div
          className="mt-2 pt-2 flex items-center justify-between"
          style={{ borderTop: "1px dashed rgba(232, 112, 58, 0.22)" }}
        >
          {zustandInfo && <ConditionDot label={zustandInfo.label} color={zustandInfo.color} />}
          {produkt.era && (
            <span
              className="font-body text-[11px]"
              style={{ color: "var(--color-ink-mute)" }}
            >
              {produkt.era}
            </span>
          )}
        </div>
      )}
    </article>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Sub-Components
 * ────────────────────────────────────────────────────────────────────────── */

function GoldCorners() {
  const corner: React.CSSProperties = {
    position:      "absolute",
    width:         14,
    height:        14,
    pointerEvents: "none",
    zIndex:        15,
  };
  const gold = "rgba(232, 112, 58, 0.45)"; // coral at 45%
  return (
    <>
      <div style={{ ...corner, top: -1,   left: -1,  borderTop:    `1.5px solid ${gold}`, borderLeft:  `1.5px solid ${gold}` }} />
      <div style={{ ...corner, top: -1,   right: -1, borderTop:    `1.5px solid ${gold}`, borderRight: `1.5px solid ${gold}` }} />
      <div style={{ ...corner, bottom: -1, left: -1, borderBottom: `1.5px solid ${gold}`, borderLeft:  `1.5px solid ${gold}` }} />
      <div style={{ ...corner, bottom: -1, right:-1, borderBottom: `1.5px solid ${gold}`, borderRight: `1.5px solid ${gold}` }} />
    </>
  );
}

function GoldDivider() {
  return (
    <div className="flex items-center mt-0" style={{ padding: "6px 0 2px" }}>
      <div className="flex-1 h-px" style={{ background: "rgba(232,112,58,0.22)" }} />
      <span className="mx-2" style={{ fontSize: 7, color: "rgba(232,112,58,0.55)", lineHeight: 1 }}>◆</span>
      <div className="flex-1 h-px" style={{ background: "rgba(232,112,58,0.22)" }} />
    </div>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: "muted" | "warning" | "gold" }) {
  const styles = {
    muted: {
      background: "rgba(15, 20, 48, 0.82)",
      color:      "var(--color-coral, #E8703A)",
    },
    warning: {
      background: "rgba(232, 112, 58, 0.92)",
      color:      "#fff",
    },
    gold: {
      background: "var(--color-coral)",
      color:      "#fff",
    },
  }[tone];

  return (
    <span
      className="px-2 py-0.5 text-[10px] uppercase font-medium"
      style={{
        ...styles,
        letterSpacing: "0.2em",
        backdropFilter: "blur(4px)",
      }}
    >
      {label}
    </span>
  );
}

function ConditionDot({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <span className="font-body text-[10px] tracking-wide" style={{ color }}>{label}</span>
    </div>
  );
}

function ImageCountDots({ count }: { count: number }) {
  const dots = Math.min(count, 5);
  return (
    <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1">
      {Array.from({ length: dots }, (_, i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width:      i === 0 ? 6 : 4,
            height:     i === 0 ? 6 : 4,
            background: i === 0 ? "rgba(232,112,58,0.92)" : "rgba(232,112,58,0.45)",
          }}
        />
      ))}
      {count > 5 && (
        <span className="font-body text-[9px] ml-0.5" style={{ color: "rgba(232,112,58,0.7)" }}>
          +{count - 5}
        </span>
      )}
    </div>
  );
}

function ImagePlaceholder({ name }: { name: string }) {
  return (
    <div
      aria-hidden
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, var(--color-paper-warm, #E8DFD0), var(--color-paper-cool, #D6CFC0))",
      }}
    >
      <div className="flex flex-col items-center gap-2 px-4 text-center">
        <Sparkles className="w-6 h-6 opacity-30" style={{ color: "var(--color-ink-mute)" }} />
        <span
          className="text-[10px] uppercase font-medium"
          style={{
            letterSpacing: "0.22em",
            color:         "var(--color-ink-mute)",
          }}
          title={name}
        >
          Без фото
        </span>
      </div>
    </div>
  );
}
