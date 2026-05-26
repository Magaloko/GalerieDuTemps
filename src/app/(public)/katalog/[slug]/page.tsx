import { notFound } from "next/navigation";
import { oeffentlichesProduktBySlug, aehnlicheProdukte } from "@/lib/db/produkte-public";
import { ProduktGrid } from "@/components/produkte/produkt-grid";
import { ProduktDetailClient } from "./client";
import { AddToCartButton } from "@/components/produkte/add-to-cart-button";
import { SpecTable } from "@/components/product/spec-table";
import { JsonLd } from "@/components/seo/json-ld";
import { productSchema, breadcrumbSchema } from "@/lib/seo/schemas";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { formatPreis } from "@/lib/utils/preis";
import { markdownToHtml } from "@/lib/utils/markdown";
import { i18nOr } from "@/lib/utils/i18n-text";
import type { Metadata } from "next";
import { getDictionary, getLocale } from "@/i18n";

interface Props { params: Promise<{ slug: string }> }

function videoEmbedSrc(url: string): { type: "iframe" | "video"; src: string } | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return { type: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return { type: "iframe", src: `https://player.vimeo.com/video/${vm[1]}` };
  if (/\.(mp4|webm|mov)(?:\?.*)?$/i.test(url)) return { type: "video", src: url };
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [p, locale] = await Promise.all([
    oeffentlichesProduktBySlug(slug),
    getLocale(),
  ]);
  if (!p) return { title: "Товар не найден" };
  const lokalName = i18nOr(p.name_i18n, locale, p.name);
  const lokalKurz = i18nOr(p.kurzbeschreibung_i18n, locale, p.kurzbeschreibung);
  return {
    title:       p.seo_titel        ?? lokalName,
    description: p.seo_beschreibung ?? lokalKurz ?? undefined,
    alternates:  { canonical: `/katalog/${slug}` },
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Product Detail — Handoff C1 (Paper).
 *
 * Layout:
 *  - Breadcrumb-Bar (uppercase 11/0.18em).
 *  - 2-col (md+): Bild-Galerie (links) + Info-Spalte (rechts, 460px).
 *    Info: eyebrow → display-md 2-line H1 mit italic+coral 2.Zeile → italic
 *    16 author/era → price block → CTAs → SpecTable.
 *  - Story-Band (bone bg, full-width): 2-col mit 2-col text columns.
 *  - Related-Grid (paper): 4-up.
 * ────────────────────────────────────────────────────────────────────────── */
export default async function ProduktDetailPage({ params }: Props) {
  const { slug } = await params;
  const [produkt, { t }] = await Promise.all([
    oeffentlichesProduktBySlug(slug),
    getDictionary(),
  ]);
  if (!produkt) notFound();

  const locale = await getLocale();
  const name   = i18nOr(produkt.name_i18n,             locale, produkt.name);
  const kurz   = i18nOr(produkt.kurzbeschreibung_i18n, locale, produkt.kurzbeschreibung);
  const lang   = i18nOr(produkt.beschreibung_i18n,     locale, produkt.beschreibung);

  const aehnliche = await aehnlicheProdukte(
    produkt.id,
    produkt.kategorie_id ?? null,
    produkt.preis,
    4
  ).catch(() => []);

  const galerie = produkt.bilder ?? [];
  const extraBilder: typeof galerie = [];
  if (produkt.hauptbild_url) {
    extraBilder.push({
      id: "haupt", produkt_id: produkt.id, url: produkt.hauptbild_url,
      alt_text: name, sortierung: -2, ist_hauptbild: true,
      breite: null, hoehe: null, dateigroesse: null, erstellt_am: produkt.erstellt_am,
    });
  }
  if (produkt.rueckbild_url) {
    extraBilder.push({
      id: "rueck", produkt_id: produkt.id, url: produkt.rueckbild_url,
      alt_text: `${name} — обратная сторона`, sortierung: -1, ist_hauptbild: false,
      breite: null, hoehe: null, dateigroesse: null, erstellt_am: produkt.erstellt_am,
    });
  }
  const bilder = [
    ...extraBilder,
    ...galerie.filter(b => b.url !== produkt.hauptbild_url && b.url !== produkt.rueckbild_url),
  ];

  const waehrung = (produkt.waehrung as "KZT"|"EUR"|"USD"|"RUB"|undefined) ?? "KZT";

  // ── JSON-LD ───────────────────────────────────────────────────────────
  const allImages = [
    produkt.hauptbild_url,
    produkt.rueckbild_url,
    ...(produkt.bilder ?? []).map(b => b.url),
  ].filter((u): u is string => Boolean(u));

  const productJsonLd = productSchema({
    id:          produkt.id,
    slug:        produkt.slug,
    name:        name,
    description: kurz ?? undefined,
    images:      allImages,
    price:       produkt.preis,
    currency:    waehrung,
    inStock:     produkt.lagerbestand > 0 && !produkt.verkauft,
    condition:   "used",
    sku:         String(produkt.id),
    category:    produkt.kategorie_name ?? undefined,
  });
  const breadcrumbJsonLd = breadcrumbSchema([
    { name: "Главная", url: "/" },
    { name: t.nav.katalog, url: "/katalog" },
    ...(produkt.kategorie_name && produkt.kategorie_slug
      ? [{ name: produkt.kategorie_name, url: `/kategorien/${produkt.kategorie_slug}` }]
      : []),
    { name, url: `/katalog/${produkt.slug}` },
  ]);

  // Headline: split name into two lines if possible (last word → italic+coral)
  const nameParts = name.trim().split(/\s+/);
  const lastWord  = nameParts.length > 1 ? nameParts.pop()! : null;
  const firstLine = nameParts.join(" ");

  return (
    <div style={{ background: "var(--color-paper)", color: "var(--color-ink)" }}>
      <JsonLd id="product" data={[productJsonLd, breadcrumbJsonLd]} />

      {/* ── Breadcrumb-Bar ───────────────────────────────────────────── */}
      <div
        className="border-b"
        style={{ borderColor: "var(--color-line)", background: "var(--color-bone)" }}
      >
        <div className="max-w-[1440px] mx-auto px-5 md:px-14 py-3 flex items-center justify-between gap-4">
          <nav className="flex items-center gap-2 text-[11px] uppercase font-medium overflow-hidden" style={{ letterSpacing: "0.18em", color: "var(--color-ink-mute)" }}>
            <Link href="/katalog" className="hover:text-coral transition-colors inline-flex items-center gap-1">
              <ChevronLeft className="w-3 h-3" /> {t.nav.katalog}
            </Link>
            {produkt.kategorie_name && (
              <>
                <span>/</span>
                <span>{produkt.kategorie_name}</span>
              </>
            )}
            <span>/</span>
            <span style={{ color: "var(--color-ink)" }} className="truncate max-w-[200px]">{name}</span>
          </nav>
          <p className="text-[11px] uppercase font-medium hidden sm:block" style={{ letterSpacing: "0.18em", color: "var(--color-ink-mute)", fontFamily: "var(--font-mono)" }}>
            Лот {String(produkt.id).padStart(4, "0")}
          </p>
        </div>
      </div>

      {/* ── Main 2-col ──────────────────────────────────────────────── */}
      <section className="max-w-[1440px] mx-auto px-5 md:px-14 py-10 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_460px] gap-8 md:gap-14">

          {/* Bild-Galerie */}
          <ProduktDetailClient bilder={bilder} produktName={name} />

          {/* Info */}
          <div>
            {produkt.kategorie_name && (
              <p
                className="text-[11px] uppercase font-medium mb-4"
                style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
              >
                {produkt.kategorie_name}
              </p>
            )}

            <h1
              style={{
                fontFamily:    "var(--font-display)",
                fontSize:      "clamp(2.5rem, 5vw, 3.5rem)",
                lineHeight:    1.02,
                letterSpacing: "-0.005em",
                color:         "var(--color-ink)",
              }}
            >
              {firstLine}
              {lastWord && (
                <>
                  <br />
                  <em
                    className="font-italic"
                    style={{ color: "var(--color-coral)", fontStyle: "italic" }}
                  >
                    {lastWord}
                  </em>
                </>
              )}
            </h1>

            {produkt.era && (
              <p
                className="mt-4 text-base"
                style={{
                  fontFamily: "var(--font-italic)",
                  fontStyle:  "italic",
                  color:      "var(--color-ink-soft)",
                }}
              >
                {produkt.era}
              </p>
            )}

            {/* Price */}
            <div className="mt-8 flex items-end gap-3">
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize:   "clamp(2rem, 4vw, 2.5rem)",
                  color:      "var(--color-ink)",
                  lineHeight: 1,
                }}
              >
                {formatPreis(produkt.preis, waehrung)}
              </p>
              {produkt.originalpreis && (
                <p
                  className="line-through mb-1 text-lg"
                  style={{ color: "var(--color-ink-mute)" }}
                >
                  {formatPreis(produkt.originalpreis, waehrung)}
                </p>
              )}
            </div>

            {/* Short description */}
            {kurz && (
              <p
                className="mt-6"
                style={{
                  fontFamily: "var(--font-italic)",
                  fontStyle:  "italic",
                  color:      "var(--color-ink-soft)",
                  lineHeight: 1.7,
                }}
              >
                {kurz}
              </p>
            )}

            {/* CTAs */}
            <div className="mt-8 space-y-3">
              <AddToCartButton
                produktId={produkt.id}
                slug={produkt.slug}
                name={produkt.name}
                bildUrl={produkt.bilder?.[0]?.url ?? null}
                preisCents={Math.round(produkt.preis * 100)}
                taxRate={12}
                lagerbestand={produkt.lagerbestand}
                verkauft={produkt.verkauft}
              />
              <Link
                href={`/kontakt?produkt=${produkt.id}`}
                className="btn-coral btn-coral-ghost btn-coral-lg w-full"
              >
                {t.produkt.kontakt}
              </Link>
            </div>

            {/* Spec Table */}
            <div className="mt-10">
              <SpecTable
                rows={[
                  { label: t.produkt.zustand,    value: produkt.zustand },
                  { label: t.produkt.era ?? "Эпоха", value: produkt.era },
                  { label: "Происхождение",      value: produkt.herkunft },
                  { label: "Материал",            value: produkt.material },
                  { label: "В наличии",           value: produkt.lagerbestand > 0 ? `${produkt.lagerbestand} шт.` : null },
                ]}
              />
            </div>

            {/* Tags */}
            {produkt.tags?.length > 0 && (
              <div className="mt-8 pt-6 border-t flex flex-wrap gap-x-3 gap-y-2" style={{ borderColor: "var(--color-line)" }}>
                {produkt.tags.map(tag => (
                  <Link
                    key={tag}
                    href={`/katalog?suche=${encodeURIComponent(tag)}`}
                    className="text-[11px] uppercase font-medium hover:text-coral transition-colors"
                    style={{ letterSpacing: "0.18em", color: "var(--color-ink-mute)" }}
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Story-Band (bone bg) ───────────────────────────────────── */}
      {lang && (
        <section style={{ background: "var(--color-bone)" }}>
          <div className="max-w-[1440px] mx-auto px-5 md:px-14 py-14 md:py-20 grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-10 md:gap-16">
            <div>
              <p
                className="text-[11px] uppercase font-medium mb-4"
                style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
              >
                История предмета
              </p>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize:   "clamp(1.75rem, 4vw, 2.25rem)",
                  color:      "var(--color-ink)",
                  lineHeight: 1.1,
                }}
              >
                <em className="font-italic" style={{ color: "var(--color-coral)", fontStyle: "italic" }}>
                  {name}
                </em>
              </h2>
            </div>
            <div
              className="prose-vintage text-[15px] leading-relaxed"
              style={{
                fontFamily: "var(--font-italic)",
                fontStyle:  "italic",
                color:      "var(--color-ink-soft)",
                columnCount: 2,
                columnGap:   32,
              }}
              dangerouslySetInnerHTML={{ __html: markdownToHtml(lang) }}
            />
          </div>
        </section>
      )}

      {/* ── Video ──────────────────────────────────────────────── */}
      {produkt.video_url && (() => {
        const embed = videoEmbedSrc(produkt.video_url);
        if (!embed) return null;
        return (
          <section className="max-w-[1440px] mx-auto px-5 md:px-14 py-14 md:py-16">
            <p
              className="text-[11px] uppercase font-medium mb-4"
              style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
            >
              ◆ Видео
            </p>
            <div
              className="relative w-full overflow-hidden"
              style={{ aspectRatio: "16 / 9", background: "var(--color-cobalt)" }}
            >
              {embed.type === "iframe" ? (
                <iframe
                  src={embed.src}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerated-2d-canvas; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video src={embed.src} controls className="absolute inset-0 w-full h-full" />
              )}
            </div>
          </section>
        );
      })()}

      {/* ── Dateien & Zertifikate ──────────────────────────────── */}
      {((produkt.dateien?.length ?? 0) > 0 || (produkt.zertifikate?.length ?? 0) > 0) && (
        <section className="max-w-[1440px] mx-auto px-5 md:px-14 py-14 grid md:grid-cols-2 gap-10">
          {(produkt.dateien?.length ?? 0) > 0 && (
            <div>
              <p className="text-[11px] uppercase font-medium mb-4" style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}>
                ◆ Документы
              </p>
              <div className="space-y-2">
                {produkt.dateien!.map(d => (
                  <a
                    key={d.id} href={d.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 px-4 py-3 hover:opacity-80 transition-opacity"
                    style={{ border: "1px solid var(--color-line)", background: "var(--color-bone)" }}
                  >
                    <span className="text-sm truncate" style={{ color: "var(--color-ink)" }}>📄 {d.name}</span>
                    {d.dateigroesse && (
                      <span className="text-xs flex-shrink-0" style={{ color: "var(--color-ink-mute)", fontFamily: "var(--font-mono)" }}>
                        {Math.round(d.dateigroesse / 1024)} КБ
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
          {(produkt.zertifikate?.length ?? 0) > 0 && (
            <div>
              <p className="text-[11px] uppercase font-medium mb-4" style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}>
                ◆ Сертификаты
              </p>
              <div className="space-y-2">
                {produkt.zertifikate!.map(z => (
                  <a
                    key={z.id} href={z.url} target="_blank" rel="noopener noreferrer"
                    className="block px-4 py-3 hover:opacity-80 transition-opacity"
                    style={{ border: "1px solid var(--color-coral)", background: "rgba(232,112,58,0.06)" }}
                  >
                    <p className="text-sm" style={{ color: "var(--color-ink)", fontFamily: "var(--font-display)", fontSize: 18 }}>{z.name}</p>
                    {(z.aussteller || z.datum) && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-mute)" }}>
                        {[z.aussteller, z.datum].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Related ────────────────────────────────────────────── */}
      {aehnliche.length > 0 && (
        <section
          className="max-w-[1440px] mx-auto px-5 md:px-14 py-16 md:py-20 border-t"
          style={{ borderColor: "var(--color-line)" }}
        >
          <p
            className="text-[11px] uppercase font-medium mb-3"
            style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
          >
            ◆
          </p>
          <h2
            className="mb-10"
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   "clamp(1.75rem, 4vw, 2.25rem)",
              color:      "var(--color-ink)",
            }}
          >
            {t.produkt.aehnlich}
          </h2>
          <ProduktGrid produkte={aehnliche} prioCount={0} />
        </section>
      )}
    </div>
  );
}
