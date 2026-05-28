import { katalogProdukte } from "@/lib/db/produkte-public";
import { alleKategorien } from "@/lib/db/kategorien";
import { isFeatureEnabled } from "@/lib/db/feature-flags";
import { maskBestandListe } from "@/lib/utils/showcase-mask";
import { ProduktGrid } from "@/components/produkte/produkt-grid";
import { FilterGroup } from "@/components/catalog/filter-group";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { SortSelect } from "./sort-select";

export const metadata: Metadata = {
  title:       "Каталог",
  description: "Все доступные винтажные вещи. Фильтр по категории, цене и состоянию.",
  alternates:  { canonical: "/katalog" },
};

interface Props {
  searchParams: Promise<Record<string, string>>;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Katalog — Handoff B1 (Paper-BG).
 *
 * 2-col Grid: 260px Sidebar (bone bg, sticky) + 1fr Main (paper bg).
 * Main: 3-row Header (eyebrow / display-md H1 / sort row mit Result-Count).
 * Grid: ProduktKarte (4/5 ratio, Paper-Card mit Heart top-right).
 *
 * Mobile: Sidebar wird zu horizontal Chip-Rail + Bottom-Sheet-Filter-Trigger.
 * ────────────────────────────────────────────────────────────────────────── */
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

  const [daten, kategorien, kaufenAktiv] = await Promise.all([
    katalogProdukte(params),
    alleKategorien(),
    isFeatureEnabled("kaufen_aktiv").catch(() => true),
  ]);

  // Schaufenster: exakten Bestand nicht in den Client-Payload geben.
  const items = maskBestandListe(daten.items, kaufenAktiv);

  const hatFilter = !!(params.suche || params.kategorie || params.zustand || params.era || params.min_preis || params.max_preis);

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const merged = {
      ...Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      ),
      ...overrides,
    };
    const qs = new URLSearchParams(
      Object.entries(merged).filter(([, v]) => v !== undefined) as [string, string][]
    );
    return `/katalog?${qs}`;
  };

  const baseQuery: Record<string, string> = Object.fromEntries(
    Object.entries(params)
      .filter(([k, v]) => v !== undefined && k !== "sortierung" && k !== "seite")
      .map(([k, v]) => [k, String(v)])
  );

  const zustandsItems = [
    { value: "sehr_gut",   label: "★★★★★ Превосходное" },
    { value: "gut",        label: "★★★★ Очень хорошее" },
    { value: "akzeptabel", label: "★★★ Приемлемое"    },
    { value: "restauriert",label: "✦ Реставрировано"  },
  ];

  return (
    <div style={{ background: "var(--color-paper)", color: "var(--color-ink)" }}>
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[260px_1fr]">

        {/* ─── Sidebar (bone bg, sticky) ───────────────────────────────── */}
        <aside
          className="hidden lg:block"
          style={{
            background:  "var(--color-bone)",
            borderRight: "1px solid var(--color-line)",
          }}
        >
          <div
            className="sticky top-0 overflow-y-auto p-8"
            style={{ maxHeight: "100vh" }}
          >
            <p
              className="text-[10px] uppercase font-medium mb-8"
              style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
            >
              {t.katalog.filter}
            </p>

            {/* Kategorien */}
            <FilterGroup
              title={t.nav.kategorien}
              items={[
                { label: t.katalog.kategorie_alle, href: buildUrl({ kategorie: undefined, seite: "1" }), active: !params.kategorie },
                ...kategorien.map(k => ({
                  label:  k.name,
                  href:   buildUrl({ kategorie: k.slug, seite: "1" }),
                  count:  k.anzahl,
                  active: params.kategorie === k.slug,
                })),
              ]}
              className="border-b"
            />

            {/* Zustand */}
            <FilterGroup
              title={t.produkt.zustand}
              items={[
                { label: t.katalog.kategorie_alle, href: buildUrl({ zustand: undefined, seite: "1" }), active: !params.zustand },
                ...zustandsItems.map(z => ({
                  label:  z.label,
                  href:   buildUrl({ zustand: z.value, seite: "1" }),
                  active: params.zustand === z.value,
                })),
              ]}
              className="border-b"
            />

            {/* Reset */}
            {hatFilter && (
              <Link
                href="/katalog"
                className="inline-block mt-4 text-[11px] uppercase font-medium hover:opacity-80 transition-opacity"
                style={{ letterSpacing: "0.22em", color: "var(--color-coral)" }}
              >
                {t.katalog.zuruecksetzen} ×
              </Link>
            )}
          </div>
        </aside>

        {/* ─── Main ───────────────────────────────────────────────────── */}
        <div className="px-5 md:px-14 py-10 md:py-16">

          {/* Header */}
          <header
            className="pb-6 mb-10"
            style={{ borderBottom: "1px solid var(--color-line)" }}
          >
            <p
              className="text-[11px] uppercase font-medium mb-3"
              style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
            >
              {t.katalog.untertitel ?? "Все винтажные находки"}
            </p>
            <h1
              className="mb-6"
              style={{
                fontFamily: "var(--font-display)",
                fontSize:   "clamp(2.5rem, 6vw, 3.5rem)",
                color:      "var(--color-ink)",
                lineHeight: 1,
              }}
            >
              {t.katalog.titel}
            </h1>

            {/* Sort + Result-Count */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p
                className="text-[11px] uppercase font-medium"
                style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    color:      "var(--color-ink)",
                  }}
                >
                  {daten.gesamt}
                </span>{" "}
                {daten.gesamt === 1 ? t.katalog.treffer_singular : t.katalog.treffer}
              </p>

              <div className="flex items-center gap-3">
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
            </div>
          </header>

          {/* Mobile Chip-Rail (Kategorien) */}
          <div className="lg:hidden -mx-5 mb-8 overflow-x-auto">
            <div className="flex items-center gap-2 px-5 pb-1">
              <Link
                href={buildUrl({ kategorie: undefined, seite: "1" })}
                className="text-[11px] uppercase font-medium whitespace-nowrap px-4 py-2 transition-colors"
                style={{
                  letterSpacing: "0.22em",
                  background:    !params.kategorie ? "var(--color-cobalt)" : "transparent",
                  color:         !params.kategorie ? "var(--color-coral)" : "var(--color-ink)",
                  border:        `1px solid ${!params.kategorie ? "var(--color-cobalt)" : "var(--color-line)"}`,
                }}
              >
                {t.katalog.kategorie_alle}
              </Link>
              {kategorien.map(k => {
                const active = params.kategorie === k.slug;
                return (
                  <Link
                    key={k.id}
                    href={buildUrl({ kategorie: k.slug, seite: "1" })}
                    className="text-[11px] uppercase font-medium whitespace-nowrap px-4 py-2 transition-colors"
                    style={{
                      letterSpacing: "0.22em",
                      background:    active ? "var(--color-cobalt)" : "transparent",
                      color:         active ? "var(--color-coral)" : "var(--color-ink)",
                      border:        `1px solid ${active ? "var(--color-cobalt)" : "var(--color-line)"}`,
                    }}
                  >
                    {k.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Aktive Filter-Chips (Desktop) */}
          {hatFilter && (
            <div className="hidden lg:flex flex-wrap gap-2 mb-8">
              {params.suche && (
                <ChipRemove label={`"${params.suche}"`} href={buildUrl({ suche: undefined, seite: "1" })} />
              )}
              {params.kategorie && (
                <ChipRemove label={kategorien.find(k => k.slug === params.kategorie)?.name ?? params.kategorie} href={buildUrl({ kategorie: undefined, seite: "1" })} />
              )}
              {params.zustand && (
                <ChipRemove label={params.zustand} href={buildUrl({ zustand: undefined, seite: "1" })} />
              )}
            </div>
          )}

          {/* Grid */}
          <ProduktGrid
            produkte={items}
            leerText={t.katalog.keine_ergebnisse}
            leerUntertext={hatFilter ? t.katalog.versuche : t.home.leer_text}
            prioCount={4}
          />

          {/* Paginierung */}
          {daten.seiten > 1 && (
            <div className="flex items-center justify-center gap-6 pt-16">
              {daten.seite > 1 ? (
                <Link
                  href={buildUrl({ seite: String(daten.seite - 1) })}
                  className="inline-flex items-center gap-2 text-[11px] uppercase font-medium hover:opacity-80 transition-opacity"
                  style={{ letterSpacing: "0.22em", color: "var(--color-ink)" }}
                >
                  <ChevronLeft className="w-4 h-4" /> {t.aktion.zurueck}
                </Link>
              ) : <span />}
              <span
                className="text-[11px] uppercase"
                style={{
                  fontFamily:    "var(--font-mono)",
                  letterSpacing: "0.22em",
                  color:         "var(--color-ink-mute)",
                }}
              >
                {String(daten.seite).padStart(2, "0")} / {String(daten.seiten).padStart(2, "0")}
              </span>
              {daten.seite < daten.seiten ? (
                <Link
                  href={buildUrl({ seite: String(daten.seite + 1) })}
                  className="inline-flex items-center gap-2 text-[11px] uppercase font-medium hover:opacity-80 transition-opacity"
                  style={{ letterSpacing: "0.22em", color: "var(--color-ink)" }}
                >
                  {t.aktion.weiter} <ChevronRight className="w-4 h-4" />
                </Link>
              ) : <span />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChipRemove({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-[11px] uppercase font-medium hover:opacity-80 transition-opacity"
      style={{
        letterSpacing: "0.18em",
        background:    "var(--color-bone)",
        color:         "var(--color-ink-soft)",
        border:        "1px solid var(--color-line)",
      }}
    >
      {label} <span style={{ color: "var(--color-coral)" }}>×</span>
    </Link>
  );
}
