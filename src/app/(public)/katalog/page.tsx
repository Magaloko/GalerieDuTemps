import { katalogProdukte } from "@/lib/db/produkte-public";
import { alleKategorien } from "@/lib/db/kategorien";
import { ProduktGrid } from "@/components/produkte/produkt-grid";
import Link from "next/link";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { SortSelect } from "./sort-select";

export const metadata: Metadata = {
  title:       "Каталог — Galerie du Temps",
  description: "Все доступные винтажные вещи. Фильтр по категории, цене и состоянию.",
};

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<Record<string, string>>;
}

export default async function KatalogPage({ searchParams }: Props) {
  const [sp, { t }] = await Promise.all([searchParams, getDictionary()]);

  const params = {
    seite:      parseInt(sp.seite ?? "1", 10),
    suche:      sp.suche      ?? undefined,
    kategorie:  sp.kategorie  ?? undefined,
    zustand:    sp.zustand    ?? undefined,
    era:        sp.era        ?? undefined,
    min_preis:  sp.min_preis  ? parseFloat(sp.min_preis)  : undefined,
    max_preis:  sp.max_preis  ? parseFloat(sp.max_preis)  : undefined,
    sortierung: sp.sortierung ?? "neu",
  };

  const [daten, kategorien] = await Promise.all([
    katalogProdukte(params),
    alleKategorien(),
  ]);

  const hatFilter = !!(params.suche || params.kategorie || params.zustand || params.era || params.min_preis || params.max_preis);

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const merged = { ...Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])), ...overrides };
    const qs = new URLSearchParams(Object.entries(merged).filter(([, v]) => v !== undefined) as [string, string][]);
    return `/katalog?${qs}`;
  };

  // Query-Map für Client-SortSelect (ohne sortierung + seite)
  const baseQuery: Record<string, string> = Object.fromEntries(
    Object.entries(params)
      .filter(([k, v]) => v !== undefined && k !== "sortierung" && k !== "seite")
      .map(([k, v]) => [k, String(v)])
  );

  const zustandsLabel: Record<string, string> = {
    sehr_gut:    "★★★★★",
    gut:         "★★★★",
    akzeptabel:  "★★★",
    restauriert: "✦",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Header */}
      <div className="mb-8">
        <p className="text-vintage-gold text-xs tracking-widest uppercase mb-1">✦</p>
        <h1 className="font-serif text-3xl text-vintage-cream">{t.katalog.titel}</h1>
        <p className="text-vintage-dust text-sm font-sans mt-1">
          {daten.gesamt} {daten.gesamt === 1 ? t.katalog.treffer_singular : t.katalog.treffer}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">

        {/* ─── Sidebar Filter ─────────────────────────────────────── */}
        <aside className="lg:w-60 flex-shrink-0">
          <div className="sticky top-24 space-y-6">

            <div className="flex items-center gap-2 text-xs font-sans uppercase tracking-widest text-vintage-dust">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {t.katalog.filter}
            </div>

            {/* Kategorien */}
            <div>
              <p className="text-xs font-sans uppercase tracking-widest text-vintage-cream/80 mb-3">{t.nav.kategorien}</p>
              <div className="space-y-1">
                <Link
                  href={buildUrl({ kategorie: undefined, seite: "1" })}
                  className={`block text-sm font-sans py-1 px-2 transition-colors ${!params.kategorie ? "text-vintage-cream font-medium" : "text-vintage-dust hover:text-vintage-cream"}`}
                  style={{ borderRadius: "var(--radius-vintage)" }}
                >
                  {t.katalog.kategorie_alle}
                </Link>
                {kategorien.map(k => (
                  <Link
                    key={k.id}
                    href={buildUrl({ kategorie: k.slug, seite: "1" })}
                    className={`flex items-center justify-between text-sm font-sans py-1 px-2 transition-colors ${params.kategorie === k.slug ? "text-vintage-cream font-medium bg-vintage-brown/40" : "text-vintage-dust hover:text-vintage-cream"}`}
                    style={{ borderRadius: "var(--radius-vintage)" }}
                  >
                    <span>{k.name}</span>
                    {k.anzahl !== undefined && <span className="text-xs text-vintage-dust">({k.anzahl})</span>}
                  </Link>
                ))}
              </div>
            </div>

            {/* Zustand */}
            <div>
              <p className="text-xs font-sans uppercase tracking-widest text-vintage-cream/80 mb-3">{t.produkt.zustand}</p>
              <div className="space-y-1">
                {[
                  { value: "",          label: t.katalog.kategorie_alle },
                  { value: "sehr_gut",  label: zustandsLabel.sehr_gut    },
                  { value: "gut",       label: zustandsLabel.gut         },
                  { value: "akzeptabel",label: zustandsLabel.akzeptabel  },
                  { value: "restauriert",label:zustandsLabel.restauriert },
                ].map(z => (
                  <Link
                    key={z.value}
                    href={buildUrl({ zustand: z.value || undefined, seite: "1" })}
                    className={`block text-sm font-sans py-1 px-2 transition-colors ${(params.zustand ?? "") === z.value ? "text-vintage-cream font-medium bg-vintage-brown/40" : "text-vintage-dust hover:text-vintage-cream"}`}
                    style={{ borderRadius: "var(--radius-vintage)" }}
                  >
                    {z.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Filter zurücksetzen */}
            {hatFilter && (
              <Link
                href="/katalog"
                className="block text-xs font-sans text-vintage-dust hover:text-vintage-burgundy transition-colors underline"
              >
                {t.katalog.zuruecksetzen}
              </Link>
            )}
          </div>
        </aside>

        {/* ─── Hauptbereich ───────────────────────────────────────── */}
        <div className="flex-1 space-y-6">

          {/* Sortierung + Suche */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <form method="GET" action="/katalog" className="flex gap-2">
              <input
                name="suche"
                defaultValue={params.suche}
                placeholder={`${t.nav.suche} …`}
                className="px-4 py-2 bg-vintage-espresso border border-vintage-sand/40 text-sm font-sans text-vintage-cream focus:outline-none focus:border-vintage-brown transition-colors"
                style={{ borderRadius: "var(--radius-vintage)", width: "220px" }}
              />
              <button
                type="submit"
                className="px-4 py-2 bg-vintage-espresso text-vintage-cream text-xs font-sans tracking-widest uppercase hover:bg-vintage-brown transition-colors"
                style={{ borderRadius: "var(--radius-button)" }}
              >
                {t.aktion.suchen}
              </button>
            </form>

            <SortSelect
              current={params.sortierung}
              baseQuery={baseQuery}
              labels={{
                neu:        t.katalog.sortier_neu,
                preis_asc:  t.katalog.sortier_preis_asc,
                preis_desc: t.katalog.sortier_preis_desc,
                name:       t.katalog.sortier_name,
              }}
            />
          </div>

          {/* Aktive Filter anzeigen */}
          {hatFilter && (
            <div className="flex flex-wrap gap-2">
              {params.suche && (
                <span className="flex items-center gap-1 px-3 py-1 bg-vintage-brown/40 border border-vintage-sand/40 text-xs font-sans text-vintage-cream/80" style={{ borderRadius: "var(--radius-vintage)" }}>
                  {t.nav.suche}: &ldquo;{params.suche}&rdquo;
                  <Link href={buildUrl({ suche: undefined, seite: "1" })} className="ml-1 text-vintage-dust hover:text-vintage-burgundy">×</Link>
                </span>
              )}
              {params.kategorie && (
                <span className="flex items-center gap-1 px-3 py-1 bg-vintage-brown/40 border border-vintage-sand/40 text-xs font-sans text-vintage-cream/80" style={{ borderRadius: "var(--radius-vintage)" }}>
                  {kategorien.find(k => k.slug === params.kategorie)?.name ?? params.kategorie}
                  <Link href={buildUrl({ kategorie: undefined, seite: "1" })} className="ml-1 text-vintage-dust hover:text-vintage-burgundy">×</Link>
                </span>
              )}
              {params.zustand && (
                <span className="flex items-center gap-1 px-3 py-1 bg-vintage-brown/40 border border-vintage-sand/40 text-xs font-sans text-vintage-cream/80" style={{ borderRadius: "var(--radius-vintage)" }}>
                  {params.zustand}
                  <Link href={buildUrl({ zustand: undefined, seite: "1" })} className="ml-1 text-vintage-dust hover:text-vintage-burgundy">×</Link>
                </span>
              )}
            </div>
          )}

          {/* Grid */}
          <ProduktGrid
            produkte={daten.items}
            leerText={t.katalog.keine_ergebnisse}
            leerUntertext={hatFilter ? t.katalog.versuche : t.home.leer_text}
          />

          {/* Paginierung */}
          {daten.seiten > 1 && (
            <div className="flex items-center justify-center gap-3 pt-8">
              {daten.seite > 1 && (
                <Link
                  href={buildUrl({ seite: String(daten.seite - 1) })}
                  className="flex items-center gap-1 px-4 py-2 border border-vintage-sand/40 text-vintage-cream/80 text-sm font-sans hover:bg-vintage-brown/40 transition-colors"
                  style={{ borderRadius: "var(--radius-button)" }}
                >
                  <ChevronLeft className="w-4 h-4" /> {t.aktion.zurueck}
                </Link>
              )}
              <span className="text-sm font-sans text-vintage-dust">
                {daten.seite} / {daten.seiten}
              </span>
              {daten.seite < daten.seiten && (
                <Link
                  href={buildUrl({ seite: String(daten.seite + 1) })}
                  className="flex items-center gap-1 px-4 py-2 border border-vintage-sand/40 text-vintage-cream/80 text-sm font-sans hover:bg-vintage-brown/40 transition-colors"
                  style={{ borderRadius: "var(--radius-button)" }}
                >
                  {t.aktion.weiter} <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
