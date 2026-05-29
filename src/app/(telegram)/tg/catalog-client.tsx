"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, X, Loader2, Sparkles, SlidersHorizontal, Star } from "lucide-react";
import { formatPreis, rabattProzent } from "@/lib/utils/preis";
import { HeartToggle } from "./heart-toggle";
import { InstagramIcon } from "@/components/produkte/instagram-icon";
import type { ProduktListItem } from "@/types/produkt";

type KatChip = { slug: string; name: string; anzahl: number };
type EraFacet = { era: string; anzahl: number };
type MaterialFacet = { material: string; anzahl: number };

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "neu",        label: "Новинки" },
  { value: "preis_asc",  label: "Цена ↑" },
  { value: "preis_desc", label: "Цена ↓" },
  { value: "name",       label: "А–Я" },
];

const ZUSTAND_OPTIONS: { value: string; label: string }[] = [
  { value: "",            label: "Любое" },
  { value: "sehr_gut",    label: "Отличное" },
  { value: "gut",         label: "Хорошее" },
  { value: "akzeptabel",  label: "Приемлемое" },
  { value: "restauriert", label: "Реставрировано" },
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
  eras,
  aktiveEra,
  aktiverZustand,
  materialien,
  aktivesMaterial,
  nurReduziert,
  instagramHighlights,
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
  eras:            EraFacet[];
  aktiveEra:       string;
  aktiverZustand:  string;
  materialien:     MaterialFacet[];
  aktivesMaterial: string;
  nurReduziert:    boolean;
  instagramHighlights: { id: string; titel: string | null; kategorie_name: string | null; bild_url: string | null }[];
  waehrung:        "KZT" | "EUR" | "USD" | "RUB";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [term, setTerm] = useState(suche);
  const [preisOffen, setPreisOffen] = useState(false);
  const [minFeld, setMinFeld] = useState(minPreis !== null ? String(minPreis) : "");
  const [maxFeld, setMaxFeld] = useState(maxPreis !== null ? String(maxPreis) : "");

  // URL aus aktuellem Filter-State bauen und navigieren.
  const navigate = (next: { q?: string; kat?: string; sort?: string; min?: string; max?: string; era?: string; zustand?: string; material?: string; sale?: boolean }) => {
    const params = new URLSearchParams();
    const q   = next.q   ?? term;
    const kat = next.kat ?? aktiveKategorie;
    const srt = next.sort ?? sortierung;
    const mn  = next.min  ?? (minPreis !== null ? String(minPreis) : "");
    const mx  = next.max  ?? (maxPreis !== null ? String(maxPreis) : "");
    const er  = next.era      ?? aktiveEra;
    const zu  = next.zustand  ?? aktiverZustand;
    const mat = next.material ?? aktivesMaterial;
    const sale = next.sale    ?? nurReduziert;
    if (q.trim())          params.set("q", q.trim());
    if (kat)               params.set("kat", kat);
    if (srt && srt !== "neu") params.set("sort", srt);
    if (mn.trim() && Number(mn) >= 0) params.set("min", String(Math.floor(Number(mn))));
    if (mx.trim() && Number(mx) >= 0) params.set("max", String(Math.ceil(Number(mx))));
    if (er)                params.set("era", er);
    if (zu)                params.set("zustand", zu);
    if (mat)               params.set("material", mat);
    if (sale)              params.set("sale", "1");
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

  const preisAktiv  = minPreis !== null || maxPreis !== null;
  const detailAktiv = preisAktiv || !!aktiveEra || !!aktiverZustand || !!aktivesMaterial || nurReduziert;
  const hatFilter   = !!suche || !!aktiveKategorie || detailAktiv;

  const alleZuruecksetzen = () => {
    setTerm(""); setMinFeld(""); setMaxFeld(""); setPreisOffen(false);
    navigate({ q: "", kat: "", min: "", max: "", era: "", zustand: "", material: "", sale: false });
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
        <h1 className="flex items-baseline gap-2" style={{ lineHeight: 1.05 }}>
          <span
            className="wordmark"
            style={{ fontSize: 22, color: "var(--tg-theme-text-color, var(--color-ink))" }}
          >
            GALERIE
          </span>
          <span className="wordmark-italic" style={{ fontSize: 14, color: "var(--color-coral)" }}>
            du Temps
          </span>
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
          borderRadius: 4,
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

      {/* „✦ Из Instagram"-Strip — nur im ungefilterten Einstieg, nur mit Bild */}
      {instagramHighlights.length > 0 && (
        <section className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <Link href="/tg/instagram" className="flex items-center gap-1.5"
              style={{ touchAction: "manipulation" }}>
              <span className="w-3.5 h-3.5 rounded-full inline-flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg,#f09433,#dc2743,#bc1888)" }} />
              <h2 className="text-[11px] uppercase font-medium"
                style={{ letterSpacing: "0.22em", color: "var(--tg-theme-text-color, var(--color-ink))" }}>
                Из Instagram
              </h2>
            </Link>
            <Link href="/tg/instagram" className="text-[11px] uppercase font-medium"
              style={{ letterSpacing: "0.16em", color: "var(--tg-theme-link-color, var(--color-coral))", touchAction: "manipulation" }}>
              Все →
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {instagramHighlights.map(ig => (
              <Link key={ig.id} href="/tg/instagram" className="block shrink-0"
                style={{ width: 116, touchAction: "manipulation" }}>
                <div className="relative w-full overflow-hidden"
                  style={{ aspectRatio: "4/5", background: "var(--color-paper-warm)", borderRadius: 6 }}>
                  {ig.bild_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ig.bild_url} alt={ig.titel ?? ""} className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full inline-flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#f09433,#dc2743,#bc1888)" }}>
                    <InstagramIcon className="w-3 h-3" style={{ color: "#fff" }} />
                  </span>
                </div>
                {ig.titel && (
                  <p className="line-clamp-1 mt-1 text-[11px]"
                    style={{ fontFamily: "var(--font-display)", color: "var(--tg-theme-text-color, var(--color-ink))" }}>
                    {ig.titel}
                  </p>
                )}
              </Link>
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
              color:         detailAktiv ? "var(--color-coral)" : "var(--tg-theme-link-color, var(--color-coral))",
              touchAction:   "manipulation",
            }}
            aria-expanded={preisOffen}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Фильтры{detailAktiv ? " •" : ""}
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

      {/* Filter-Panel (einklappbar): Epoche · Zustand · Preis */}
      {preisOffen && (
        <div
          className="mb-4 p-3 space-y-4"
          style={{
            background:   "var(--tg-theme-section-bg-color, #fff)",
            border:       "1px solid var(--color-line)",
            borderRadius: 4,
          }}
        >
          {/* Nur reduziert (Sale) — prominenter Toggle */}
          <button
            type="button"
            onClick={() => navigate({ sale: !nurReduziert })}
            className="w-full flex items-center justify-between px-3 py-2.5"
            style={{
              borderRadius: 10, touchAction: "manipulation",
              background: nurReduziert ? "var(--color-coral)" : "var(--color-bone)",
              border:     `1px solid ${nurReduziert ? "var(--color-coral)" : "var(--color-line)"}`,
            }}
            aria-pressed={nurReduziert}
          >
            <span className="text-[12px] font-medium"
              style={{ color: nurReduziert ? "#fff" : "var(--tg-theme-text-color, var(--color-ink))" }}>
              🏷 Только со скидкой
            </span>
            <span className="text-[10px] uppercase font-medium"
              style={{ letterSpacing: "0.14em", color: nurReduziert ? "#fff" : "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
              {nurReduziert ? "вкл" : "выкл"}
            </span>
          </button>

          {/* Epoche (Era) — Chips aus verfügbaren Werten */}
          {eras.length > 0 && (
            <div>
              <p className="text-[10px] uppercase font-medium mb-2"
                style={{ letterSpacing: "0.18em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
                Эпоха
              </p>
              <div className="flex flex-wrap gap-1.5">
                {eras.map(e => {
                  const aktiv = aktiveEra === e.era;
                  return (
                    <button key={e.era} type="button"
                      onClick={() => navigate({ era: aktiv ? "" : e.era })}
                      className="px-2.5 py-1 text-[11px] font-medium whitespace-nowrap"
                      style={{
                        borderRadius: 999, touchAction: "manipulation",
                        background: aktiv ? "var(--color-coral)" : "var(--tg-theme-section-bg-color, var(--color-bone))",
                        color:      aktiv ? "#fff" : "var(--tg-theme-text-color, var(--color-ink))",
                        border:     `1px solid ${aktiv ? "var(--color-coral)" : "var(--color-line)"}`,
                      }}>
                      {e.era}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Material — Chips aus verfügbaren Werten */}
          {materialien.length > 0 && (
            <div>
              <p className="text-[10px] uppercase font-medium mb-2"
                style={{ letterSpacing: "0.18em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
                Материал
              </p>
              <div className="flex flex-wrap gap-1.5">
                {materialien.map(m => {
                  const aktiv = aktivesMaterial === m.material;
                  return (
                    <button key={m.material} type="button"
                      onClick={() => navigate({ material: aktiv ? "" : m.material })}
                      className="px-2.5 py-1 text-[11px] font-medium whitespace-nowrap"
                      style={{
                        borderRadius: 999, touchAction: "manipulation",
                        background: aktiv ? "var(--color-coral)" : "var(--tg-theme-section-bg-color, var(--color-bone))",
                        color:      aktiv ? "#fff" : "var(--tg-theme-text-color, var(--color-ink))",
                        border:     `1px solid ${aktiv ? "var(--color-coral)" : "var(--color-line)"}`,
                      }}>
                      {m.material}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Zustand */}
          <div>
            <p className="text-[10px] uppercase font-medium mb-2"
              style={{ letterSpacing: "0.18em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
              Состояние
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ZUSTAND_OPTIONS.map(z => {
                const aktiv = (aktiverZustand || "") === z.value;
                return (
                  <button key={z.value || "alle"} type="button"
                    onClick={() => navigate({ zustand: z.value })}
                    className="px-2.5 py-1 text-[11px] font-medium whitespace-nowrap"
                    style={{
                      borderRadius: 999, touchAction: "manipulation",
                      background: aktiv ? "var(--color-coral)" : "var(--color-bone)",
                      color:      aktiv ? "#fff" : "var(--tg-theme-text-color, var(--color-ink))",
                      border:     `1px solid ${aktiv ? "var(--color-coral)" : "var(--color-line)"}`,
                    }}>
                    {z.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preis */}
          <div>
            <p className="text-[10px] uppercase font-medium mb-2"
              style={{ letterSpacing: "0.18em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
              Цена · {waehrung}
            </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={minFeld}
              onChange={e => setMinFeld(e.target.value)}
              placeholder={preisRange.min ? `от ${preisRange.min}` : "от"}
              className="w-full bg-transparent px-2 py-2 text-sm outline-none"
              style={{ border: "1px solid var(--color-line)", borderRadius: 4, color: "var(--tg-theme-text-color, var(--color-ink))" }}
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
              style={{ border: "1px solid var(--color-line)", borderRadius: 4, color: "var(--tg-theme-text-color, var(--color-ink))" }}
            />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => navigate({ min: minFeld, max: maxFeld })}
              className="flex-1 py-2 text-[11px] uppercase font-medium"
              style={{ letterSpacing: "0.18em", background: "var(--color-coral)", color: "#fff", borderRadius: 4, touchAction: "manipulation" }}
            >
              Применить
            </button>
            {preisAktiv && (
              <button
                type="button"
                onClick={() => { setMinFeld(""); setMaxFeld(""); navigate({ min: "", max: "" }); }}
                className="py-2 px-3 text-[11px] uppercase font-medium"
                style={{ letterSpacing: "0.14em", border: "1px solid var(--color-line)", color: "var(--tg-theme-text-color, var(--color-ink))", borderRadius: 4, touchAction: "manipulation" }}
              >
                Сброс
              </button>
            )}
          </div>
          </div>{/* /Preis */}

          {/* Alle Filter zurücksetzen */}
          {detailAktiv && (
            <button
              type="button"
              onClick={alleZuruecksetzen}
              className="w-full py-2 text-[11px] uppercase font-medium"
              style={{ letterSpacing: "0.16em", color: "var(--color-coral)", touchAction: "manipulation" }}
            >
              Сбросить все фильтры
            </button>
          )}
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
              background:    produkt.verkauft ? "rgba(15,20,48,0.82)" : "rgba(232,112,58,0.92)",
              color:         produkt.verkauft ? "var(--color-coral, #E8703A)" : "#fff",
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

/* ──────────────────────────────────────────────────────────────────────────
 * MiniCard — 1:1 wie ProduktKarte (website), adaptiert für die Mini-App.
 * Unterschiede: /tg/-Links, HeartToggle statt useWunschliste, kein Hover.
 * ────────────────────────────────────────────────────────────────────────── */

const ZUSTAND_INFO: Record<string, { label: string; color: string }> = {
  sehr_gut:    { label: "Отличное",       color: "#7A8B6F" },
  gut:         { label: "Хорошее",        color: "#B08D57" },
  akzeptabel:  { label: "Приемлемое",     color: "#C9956B" },
  restauriert: { label: "Реставрировано", color: "#8B6F47" },
};

function MiniCard({ produkt }: { produkt: ProduktListItem & { era?: string | null } }) {
  const waehrung   = (produkt.waehrung as "KZT"|"EUR"|"USD"|"RUB"|undefined) ?? "KZT";
  const zustandInfo = ZUSTAND_INFO[produkt.zustand];
  const rabatt      = produkt.originalpreis ? rabattProzent(produkt.preis, produkt.originalpreis) : 0;
  const ausverkauft = produkt.lagerbestand === 0 && !produkt.verkauft;
  const keyDetail   = produkt.material || produkt.era || produkt.herkunft || null;

  return (
    <article className="relative" style={{ touchAction: "manipulation" }}>
      {/* Gold-Corners */}
      <TgGoldCorners />

      {/* Bild */}
      <Link href={`/tg/produkt/${produkt.slug}`} className="block relative overflow-hidden"
        style={{ aspectRatio: "4/5", background: "var(--color-paper-warm)" }}>
        {produkt.hauptbild_url ? (
          <Image src={produkt.hauptbild_url} alt={produkt.name} fill
            sizes="(max-width:768px) 50vw, 200px" className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--color-paper-warm), var(--color-bone))" }}>
            <Sparkles className="w-5 h-5 opacity-25" style={{ color: "var(--color-ink-mute)" }} />
          </div>
        )}

        {/* Badges top-left */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {produkt.verkauft ? (
            <TgBadge label="Продано" tone="muted" />
          ) : produkt.reserviert ? (
            <TgBadge label="Бронь" tone="gold" />
          ) : ausverkauft ? (
            <TgBadge label="Нет в наличии" tone="warning" />
          ) : produkt.ist_neu ? (
            <TgBadge label="Новинка" tone="gold" />
          ) : null}
          {rabatt > 0 && !produkt.verkauft && (
            <span className="px-1.5 py-0.5 text-[9px] uppercase font-medium"
              style={{ letterSpacing: "0.16em", background: "var(--color-coral)", color: "#fff" }}>
              −{rabatt}%
            </span>
          )}
        </div>

        {/* Featured-Badge: etwas tiefer als Heart (Heart ist top-2 right-2) */}
        {produkt.featured && !produkt.verkauft && (
          <div className="absolute z-10 flex items-center gap-0.5 px-1.5 py-0.5"
            style={{ top: "2.25rem", right: "0.5rem", background: "rgba(15,20,48,0.88)",
              color: "var(--color-coral, #E8703A)", letterSpacing: "0.16em", fontSize: 9,
              fontWeight: 500, textTransform: "uppercase" }}>
            <Star className="w-2 h-2" fill="currentColor" />
            Топ
          </div>
        )}

        {/* Heart (overlay — immer top-2 right-2) */}
        <HeartToggle produktId={produkt.id} overlay size={14} />

        {/* KeyDetail bottom-left */}
        {keyDetail && !produkt.verkauft && (
          <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5"
            style={{ background: "rgba(15,20,48,0.78)", backdropFilter: "blur(4px)",
              color: "var(--color-coral, #E8703A)", letterSpacing: "0.16em", fontSize: 9,
              fontWeight: 500, textTransform: "uppercase" }}>
            {keyDetail}
          </div>
        )}

        {/* ImageCount-Dots bottom-right */}
        {produkt.bilder_count && produkt.bilder_count > 1 && (
          <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1">
            {Array.from({ length: Math.min(produkt.bilder_count, 5) }, (_, i) => (
              <div key={i} className="rounded-full"
                style={{ width: i === 0 ? 5 : 3.5, height: i === 0 ? 5 : 3.5,
                  background: i === 0 ? "rgba(232,112,58,0.92)" : "rgba(232,112,58,0.45)" }} />
            ))}
          </div>
        )}
      </Link>

      {/* Gold-Divider */}
      <div className="flex items-center" style={{ padding: "5px 0 2px" }}>
        <div className="flex-1 h-px" style={{ background: "rgba(232,112,58,0.22)" }} />
        <span className="mx-1.5" style={{ fontSize: 6, color: "rgba(232,112,58,0.55)", lineHeight: 1 }}>◆</span>
        <div className="flex-1 h-px" style={{ background: "rgba(232,112,58,0.22)" }} />
      </div>

      {/* Info */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {produkt.kategorie_name && (
            <p className="text-[9px] uppercase font-medium truncate mb-0.5"
              style={{ letterSpacing: "0.2em", color: "var(--tg-theme-link-color, var(--color-coral))" }}>
              {produkt.kategorie_name}
            </p>
          )}
          <Link href={`/tg/produkt/${produkt.slug}`}>
            <h3 className="line-clamp-2 leading-tight"
              style={{ fontFamily: "var(--font-display)", fontSize: 17,
                color: "var(--tg-theme-text-color, var(--color-ink))" }}>
              {produkt.name}
            </h3>
          </Link>
        </div>
        {/* Price */}
        <div className="text-right shrink-0">
          <p style={{ fontFamily: "var(--font-display)", fontSize: 17, lineHeight: 1,
            color: produkt.verkauft ? "var(--color-ink-mute)" : "var(--tg-theme-text-color, var(--color-ink))",
            textDecoration: produkt.verkauft ? "line-through" : undefined }}>
            {formatPreis(produkt.preis, waehrung, true)}
          </p>
          {produkt.originalpreis && !produkt.verkauft && (
            <p className="text-[10px] line-through mt-0.5" style={{ color: "var(--color-ink-mute)" }}>
              {formatPreis(produkt.originalpreis, waehrung, true)}
            </p>
          )}
        </div>
      </div>

      {/* Footer: Condition + Era */}
      {(zustandInfo || produkt.era) && (
        <div className="mt-1.5 pt-1.5 flex items-center justify-between"
          style={{ borderTop: "1px dashed rgba(232,112,58,0.22)" }}>
          {zustandInfo && (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: zustandInfo.color }} />
              <span className="text-[9px]" style={{ color: zustandInfo.color, letterSpacing: "0.1em" }}>
                {zustandInfo.label}
              </span>
            </div>
          )}
          {produkt.era && (
            <span className="text-[9px]" style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
              {produkt.era}
            </span>
          )}
        </div>
      )}
    </article>
  );
}

function TgGoldCorners() {
  const s: React.CSSProperties = { position: "absolute", width: 12, height: 12, pointerEvents: "none", zIndex: 15 };
  const g = "rgba(232,112,58,0.45)";
  return (
    <>
      <div style={{ ...s, top: -1,  left: -1,  borderTop:    `1.5px solid ${g}`, borderLeft:  `1.5px solid ${g}` }} />
      <div style={{ ...s, top: -1,  right: -1, borderTop:    `1.5px solid ${g}`, borderRight: `1.5px solid ${g}` }} />
      <div style={{ ...s, bottom: -1, left: -1, borderBottom: `1.5px solid ${g}`, borderLeft:  `1.5px solid ${g}` }} />
      <div style={{ ...s, bottom: -1, right: -1, borderBottom: `1.5px solid ${g}`, borderRight: `1.5px solid ${g}` }} />
    </>
  );
}

function TgBadge({ label, tone }: { label: string; tone: "muted" | "warning" | "gold" }) {
  const bg = {
    muted:   { background: "rgba(15,20,48,0.82)",  color: "var(--color-coral, #E8703A)" },
    warning: { background: "rgba(232,112,58,0.92)", color: "#fff" },
    gold:    { background: "var(--color-coral)", color: "#fff" },
  }[tone];
  return (
    <span className="px-1.5 py-0.5 text-[9px] uppercase font-medium"
      style={{ ...bg, letterSpacing: "0.18em", backdropFilter: "blur(4px)" }}>
      {label}
    </span>
  );
}
