"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, X, Loader2, Sparkles, SlidersHorizontal } from "lucide-react";
import { formatPreis } from "@/lib/utils/preis";
import { HeartToggle } from "./heart-toggle";
import type { ProduktListItem } from "@/types/produkt";

type KatChip = { slug: string; name: string; anzahl: number };

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "neu",        label: "Новинки" },
  { value: "preis_asc",  label: "Цена ↑" },
  { value: "preis_desc", label: "Цена ↓" },
  { value: "name",       label: "А–Я" },
];

/* ──────────────────────────────────────────────────────────────────────────
 * Mini-App Catalog — mit Suche, Kategorie-Chips & Sortierung
 *
 * Filter-State lebt in der URL (?q=&kat=&sort=). Eingaben pushen via Router;
 * die Server-Component lädt neu (DB-FTS + gecacht). Suche ist debounced
 * (350 ms), damit nicht jeder Tastendruck einen Roundtrip auslöst.
 *
 * Theme: nutzt --tg-theme-* CSS-Variablen die Telegram setzt (vom Layout
 * mit unseren Brand-Farben als Fallback gemerged).
 * ────────────────────────────────────────────────────────────────────────── */
export function TelegramCatalogClient({
  produkte,
  gesamt,
  kategorien,
  neuheiten,
  suche,
  aktiveKategorie,
  sortierung,
  minPreis,
  maxPreis,
  preisRange,
  waehrung,
}: {
  produkte:        (ProduktListItem & { era?: string | null })[];
  gesamt:          number;
  kategorien:      KatChip[];
  neuheiten:       (ProduktListItem & { era?: string | null })[];
  suche:           string;
  aktiveKategorie: string;
  sortierung:      string;
  minPreis:        number | null;
  maxPreis:        number | null;
  preisRange:      { min: number; max: number };
  waehrung:        "KZT" | "EUR" | "USD" | "RUB";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [term, setTerm] = useState(suche);
  const [preisOffen, setPreisOffen] = useState(false);
  const [minFeld, setMinFeld] = useState(minPreis !== null ? String(minPreis) : "");
  const [maxFeld, setMaxFeld] = useState(maxPreis !== null ? String(maxPreis) : "");

  // URL aus aktuellem Filter-State bauen und navigieren.
  const navigate = (next: { q?: string; kat?: string; sort?: string; min?: string; max?: string }) => {
    const params = new URLSearchParams();
    const q   = next.q   ?? term;
    const kat = next.kat ?? aktiveKategorie;
    const srt = next.sort ?? sortierung;
    const mn  = next.min  ?? (minPreis !== null ? String(minPreis) : "");
    const mx  = next.max  ?? (maxPreis !== null ? String(maxPreis) : "");
    if (q.trim())          params.set("q", q.trim());
    if (kat)               params.set("kat", kat);
    if (srt && srt !== "neu") params.set("sort", srt);
    if (mn.trim() && Number(mn) >= 0) params.set("min", String(Math.floor(Number(mn))));
    if (mx.trim() && Number(mx) >= 0) params.set("max", String(Math.ceil(Number(mx))));
    const qs = params.toString();
    startTransition(() => router.push(qs ? `/tg?${qs}` : "/tg"));
  };

  // Debounce für die Sucheingabe — nur navigieren, wenn sich der getrimmte
  // Term gegenüber dem Server-State unterscheidet.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (term.trim() === suche.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate({ q: term }), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  // Server-State → lokale Felder synchron halten (z.B. Back-Navigation).
  useEffect(() => { setTerm(suche); }, [suche]);
  useEffect(() => { setMinFeld(minPreis !== null ? String(minPreis) : ""); }, [minPreis]);
  useEffect(() => { setMaxFeld(maxPreis !== null ? String(maxPreis) : ""); }, [maxPreis]);

  const preisAktiv = minPreis !== null || maxPreis !== null;
  const hatFilter  = !!suche || !!aktiveKategorie || preisAktiv;

  const alleZuruecksetzen = () => {
    setTerm(""); setMinFeld(""); setMaxFeld(""); setPreisOffen(false);
    navigate({ q: "", kat: "", min: "", max: "" });
  };

  return (
    <main className="p-4">
      <header className="mb-4">
        <p
          className="text-[10px] uppercase font-medium mb-2"
          style={{
            letterSpacing: "0.28em",
            color:         "var(--tg-theme-link-color, var(--color-coral))",
          }}
        >
          Каталог
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   28,
            lineHeight: 1.05,
            color:      "var(--tg-theme-text-color, var(--color-ink))",
          }}
        >
          Galerie du Temps
        </h1>
        <Link
          href="/tg/instagram"
          className="inline-flex items-center gap-1 mt-2 text-[11px] uppercase font-medium"
          style={{ letterSpacing: "0.18em", color: "var(--tg-theme-link-color, var(--color-coral))" }}
        >
          ✦ Из Instagram →
        </Link>
      </header>

      {/* Suchfeld */}
      <div
        className="relative flex items-center mb-3"
        style={{
          background:   "var(--tg-theme-section-bg-color, #fff)",
          border:       "1px solid var(--color-line)",
          borderRadius: 12,
        }}
      >
        <Search className="w-4 h-4 ml-3 shrink-0" style={{ color: "var(--color-coral)" }} />
        <input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          value={term}
          onChange={e => setTerm(e.target.value)}
          placeholder="Поиск по каталогу…"
          className="flex-1 bg-transparent px-2 py-3 text-sm outline-none"
          style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }}
        />
        {(pending || term) && (
          <button
            type="button"
            onClick={() => { setTerm(""); navigate({ q: "" }); }}
            className="mr-2 p-1.5 shrink-0"
            aria-label="Очистить"
            style={{ touchAction: "manipulation", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Kategorie-Chips (horizontal scrollbar) */}
      {kategorien.length > 0 && (
        <div
          className="flex gap-2 overflow-x-auto pb-1 mb-3"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <Chip
            label="Все"
            aktiv={!aktiveKategorie}
            onClick={() => navigate({ kat: "" })}
          />
          {kategorien.map(k => (
            <Chip
              key={k.slug}
              label={k.name}
              count={k.anzahl}
              aktiv={aktiveKategorie === k.slug}
              onClick={() => navigate({ kat: aktiveKategorie === k.slug ? "" : k.slug })}
            />
          ))}
        </div>
      )}

      {/* „Новинки"-Strip — nur im ungefilterten Einstieg (Server liefert sonst []) */}
      {neuheiten.length > 0 && (
        <section className="mb-5">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--color-coral)" }} />
            <h2
              className="text-[11px] uppercase font-medium"
              style={{
                letterSpacing: "0.22em",
                color:         "var(--tg-theme-text-color, var(--color-ink))",
              }}
            >
              Новинки
            </h2>
          </div>
          <div
            className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {neuheiten.map(n => (
              <NeuheitCard key={n.id} produkt={n} />
            ))}
          </div>
        </section>
      )}

      {/* Ergebnis-Zeile + Preis-Filter-Toggle + Sortierung */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <p
          className="text-sm shrink-0"
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--tg-theme-hint-color, var(--color-ink-soft))",
          }}
        >
          {gesamt} {plural(gesamt)}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPreisOffen(o => !o)}
            className="inline-flex items-center gap-1 text-[11px] uppercase font-medium py-1"
            style={{
              letterSpacing: "0.14em",
              color:         preisAktiv ? "var(--color-coral)" : "var(--tg-theme-link-color, var(--color-coral))",
              touchAction:   "manipulation",
            }}
            aria-expanded={preisOffen}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Цена{preisAktiv ? " •" : ""}
          </button>
          <select
            value={sortierung}
            onChange={e => navigate({ sort: e.target.value })}
            className="text-[11px] uppercase font-medium bg-transparent outline-none py-1"
            style={{
              letterSpacing: "0.14em",
              color:         "var(--tg-theme-link-color, var(--color-coral))",
              touchAction:   "manipulation",
            }}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value} style={{ color: "var(--color-ink)" }}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Preis-Filter-Panel (einklappbar) */}
      {preisOffen && (
        <div
          className="mb-4 p-3"
          style={{
            background:   "var(--tg-theme-section-bg-color, #fff)",
            border:       "1px solid var(--color-line)",
            borderRadius: 12,
          }}
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={minFeld}
              onChange={e => setMinFeld(e.target.value)}
              placeholder={preisRange.min ? `от ${preisRange.min}` : "от"}
              className="w-full bg-transparent px-2 py-2 text-sm outline-none"
              style={{ border: "1px solid var(--color-line)", borderRadius: 8, color: "var(--tg-theme-text-color, var(--color-ink))" }}
            />
            <span style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>—</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={maxFeld}
              onChange={e => setMaxFeld(e.target.value)}
              placeholder={preisRange.max ? `до ${preisRange.max}` : "до"}
              className="w-full bg-transparent px-2 py-2 text-sm outline-none"
              style={{ border: "1px solid var(--color-line)", borderRadius: 8, color: "var(--tg-theme-text-color, var(--color-ink))" }}
            />
          </div>
          <p className="mt-2 text-[10px]" style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
            {waehrung}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => navigate({ min: minFeld, max: maxFeld })}
              className="flex-1 py-2 text-[11px] uppercase font-medium"
              style={{ letterSpacing: "0.18em", background: "var(--color-coral)", color: "#fff", borderRadius: 8, touchAction: "manipulation" }}
            >
              Применить
            </button>
            {preisAktiv && (
              <button
                type="button"
                onClick={() => { setMinFeld(""); setMaxFeld(""); navigate({ min: "", max: "" }); }}
                className="py-2 px-3 text-[11px] uppercase font-medium"
                style={{ letterSpacing: "0.14em", border: "1px solid var(--color-line)", color: "var(--tg-theme-text-color, var(--color-ink))", borderRadius: 8, touchAction: "manipulation" }}
              >
                Сброс
              </button>
            )}
          </div>
        </div>
      )}

      {produkte.length === 0 ? (
        <div className="py-16 text-center">
          <p style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
            {hatFilter ? "Ничего не найдено." : "Каталог пуст."}
          </p>
          {hatFilter && (
            <button
              type="button"
              onClick={alleZuruecksetzen}
              className="mt-3 text-[11px] uppercase font-medium"
              style={{ letterSpacing: "0.18em", color: "var(--color-coral)", touchAction: "manipulation" }}
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      ) : (
        <div
          className="grid grid-cols-2 gap-3 transition-opacity"
          style={{ opacity: pending ? 0.55 : 1 }}
        >
          {produkte.map(p => (
            <MiniCard key={p.id} produkt={p} />
          ))}
        </div>
      )}
    </main>
  );
}

function plural(n: number): string {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "предмет";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "предмета";
  return "предметов";
}

function Chip({
  label, count, aktiv, onClick,
}: { label: string; count?: number; aktiv: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 px-3 py-1.5 text-[11px] uppercase font-medium whitespace-nowrap transition-colors"
      style={{
        letterSpacing: "0.12em",
        borderRadius:  999,
        touchAction:   "manipulation",
        background:    aktiv ? "var(--color-coral)" : "var(--tg-theme-section-bg-color, #fff)",
        color:         aktiv ? "#fff" : "var(--tg-theme-text-color, var(--color-ink))",
        border:        `1px solid ${aktiv ? "var(--color-coral)" : "var(--color-line)"}`,
      }}
    >
      {label}{count !== undefined ? ` · ${count}` : ""}
    </button>
  );
}

function NeuheitCard({ produkt }: { produkt: ProduktListItem & { era?: string | null } }) {
  const waehrung = (produkt.waehrung as "KZT"|"EUR"|"USD"|"RUB"|undefined) ?? "KZT";
  return (
    <Link
      href={`/tg/produkt/${produkt.slug}`}
      className="block shrink-0"
      style={{ width: 132, touchAction: "manipulation" }}
    >
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: "4/5", background: "var(--color-paper-warm)" }}
      >
        {produkt.hauptbild_url && (
          <Image src={produkt.hauptbild_url} alt={produkt.name} fill sizes="132px" className="object-cover" />
        )}
        {produkt.ist_neu && !produkt.verkauft && !produkt.reserviert && (
          <span
            className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[9px] uppercase font-medium"
            style={{
              letterSpacing: "0.14em",
              background:    "var(--color-coral)",
              color:         "#fff",
              borderRadius:  3,
            }}
          >
            Новинка
          </span>
        )}
        {(produkt.verkauft || produkt.reserviert) && (
          <span
            className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[9px] uppercase font-medium"
            style={{
              letterSpacing: "0.14em",
              background:    produkt.verkauft ? "rgba(15,20,48,0.82)" : "rgba(201,168,76,0.92)",
              color:         produkt.verkauft ? "var(--color-gold, #C9A84C)" : "#1a1410",
              backdropFilter:"blur(4px)",
            }}
          >
            {produkt.verkauft ? "Продано" : "Зарезервировано"}
          </span>
        )}
      </div>
      <h3
        className="line-clamp-2 mt-1.5"
        style={{
          fontFamily: "var(--font-display)",
          fontSize:   14,
          lineHeight: 1.15,
          color:      "var(--tg-theme-text-color, var(--color-ink))",
        }}
      >
        {produkt.name}
      </h3>
      <p
        className="mt-0.5"
        style={{
          fontFamily: "var(--font-display)",
          fontSize:   13,
          color:      "var(--tg-theme-text-color, var(--color-ink))",
        }}
      >
        {formatPreis(produkt.preis, waehrung)}
      </p>
    </Link>
  );
}

function MiniCard({ produkt }: { produkt: ProduktListItem & { era?: string | null } }) {
  const waehrung = (produkt.waehrung as "KZT"|"EUR"|"USD"|"RUB"|undefined) ?? "KZT";
  return (
    <Link
      href={`/tg/produkt/${produkt.slug}`}
      className="block group"
      style={{ touchAction: "manipulation" }}
    >
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: "4/5",
          background:  "var(--color-paper-warm)",
        }}
      >
        {produkt.hauptbild_url && (
          <Image
            src={produkt.hauptbild_url}
            alt={produkt.name}
            fill
            sizes="(max-width:768px) 50vw, 200px"
            className="object-cover"
          />
        )}
        <HeartToggle produktId={produkt.id} overlay size={16} />
        {(produkt.verkauft || produkt.reserviert) && (
          <span
            className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[9px] uppercase font-medium"
            style={{
              letterSpacing: "0.14em",
              background:    produkt.verkauft ? "rgba(15,20,48,0.82)" : "rgba(201,168,76,0.92)",
              color:         produkt.verkauft ? "var(--color-gold, #C9A84C)" : "#1a1410",
              backdropFilter:"blur(4px)",
            }}
          >
            {produkt.verkauft ? "Продано" : "Зарезервировано"}
          </span>
        )}
      </div>
      <div className="pt-2">
        {produkt.kategorie_name && (
          <p
            className="text-[9px] uppercase font-medium truncate"
            style={{
              letterSpacing: "0.18em",
              color:         "var(--tg-theme-link-color, var(--color-coral))",
            }}
          >
            {produkt.kategorie_name}
          </p>
        )}
        <h3
          className="line-clamp-2 mt-0.5"
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   16,
            lineHeight: 1.15,
            color:      "var(--tg-theme-text-color, var(--color-ink))",
          }}
        >
          {produkt.name}
        </h3>
        <p
          className="mt-1"
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   15,
            color:      "var(--tg-theme-text-color, var(--color-ink))",
          }}
        >
          {formatPreis(produkt.preis, waehrung)}
        </p>
      </div>
    </Link>
  );
}
