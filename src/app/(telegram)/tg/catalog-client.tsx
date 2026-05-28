"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, X, Loader2 } from "lucide-react";
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
  suche,
  aktiveKategorie,
  sortierung,
}: {
  produkte:        (ProduktListItem & { era?: string | null })[];
  gesamt:          number;
  kategorien:      KatChip[];
  suche:           string;
  aktiveKategorie: string;
  sortierung:      string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [term, setTerm] = useState(suche);

  // URL aus aktuellem Filter-State bauen und navigieren.
  const navigate = (next: { q?: string; kat?: string; sort?: string }) => {
    const params = new URLSearchParams();
    const q   = next.q   ?? term;
    const kat = next.kat ?? aktiveKategorie;
    const srt = next.sort ?? sortierung;
    if (q.trim())          params.set("q", q.trim());
    if (kat)               params.set("kat", kat);
    if (srt && srt !== "neu") params.set("sort", srt);
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

  // Server-State → lokales Feld synchron halten (z.B. Back-Navigation).
  useEffect(() => { setTerm(suche); }, [suche]);

  const hatFilter = !!suche || !!aktiveKategorie;

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

      {/* Ergebnis-Zeile + Sortierung */}
      <div className="flex items-center justify-between mb-4">
        <p
          className="text-sm"
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--tg-theme-hint-color, var(--color-ink-soft))",
          }}
        >
          {gesamt} {plural(gesamt)}
        </p>
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

      {produkte.length === 0 ? (
        <div className="py-16 text-center">
          <p style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
            {hatFilter ? "Ничего не найдено." : "Каталог пуст."}
          </p>
          {hatFilter && (
            <button
              type="button"
              onClick={() => { setTerm(""); navigate({ q: "", kat: "" }); }}
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
