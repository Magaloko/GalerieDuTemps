import { notFound } from "next/navigation";
import { oeffentlichesProduktBySlug, aehnlicheProdukte } from "@/lib/db/produkte-public";
import { kontaktKanaeleLaden, whatsappUrl, telegramUrl } from "@/lib/db/kontakt-kanaele";
import { getKaspiConfig, kaspiKonfiguriert } from "@/lib/payment/kaspi";
import { InstagramEmbeds } from "@/components/produkte/instagram-embeds";
import { ProduktGrid } from "@/components/produkte/produkt-grid";
import { ImageGallery } from "@/components/produkte/image-gallery";
import { ProduktDetailSidebar } from "@/components/produkte/produkt-detail-sidebar";
import { ExpandableSection } from "@/components/produkte/expandable-section";
import { ConditionMeter } from "@/components/produkte/condition-meter";
import { JsonLd } from "@/components/seo/json-ld";
import { productSchema, breadcrumbSchema } from "@/lib/seo/schemas";
import Link from "next/link";
import { ChevronLeft, MessageCircle, Send } from "lucide-react";
import { formatPreis } from "@/lib/utils/preis";
import { markdownToHtml } from "@/lib/utils/markdown";
import { i18nOr } from "@/lib/utils/i18n-text";
import type { Metadata } from "next";
import { getDictionary, getLocale } from "@/i18n";
import { siteUrl } from "@/lib/site-url";
import { isFeatureEnabled } from "@/lib/db/feature-flags";
import { maskBestandListe } from "@/lib/utils/showcase-mask";
import { ProduktStory } from "@/components/produkte/produkt-story";

interface Props { params: Promise<{ slug: string }> }

function videoEmbedSrc(url: string): { type: "iframe" | "video"; src: string } | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return { type: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return { type: "iframe", src: `https://player.vimeo.com/video/${vm[1]}` };
  if (/\.(mp4|webm|mov)(?:\?.*)?$/i.test(url)) return { type: "video", src: url };
  return null;
}

function whatsappMessage(produktName: string, preis: string, produktUrl: string): string {
  return `Здравствуйте! Интересует товар: "${produktName}" (${preis})\n${produktUrl}`;
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
 * Produkt-Detail-Page v2 — Welle 2+3
 *
 * Layout (Reference-inspired):
 *  1. Breadcrumb-Bar (top, bone bg)
 *  2. Title CENTERED above gallery (uppercase eyebrow → display title)
 *  3. Full-width Image-Gallery (side-by-side slider mit Lightbox)
 *  4. Mobile-only: kompakter CTA-Strip nach Gallery
 *  5. 2-Spalten:
 *     - Left (2/3): ExpandableSections (Описание, Характеристики,
 *       Состояние mit ConditionMeter, Происхождение, Tags)
 *     - Right (1/3): Sticky ProduktDetailSidebar
 *  6. Story-Band (full-width, bone — wie vorher)
 *  7. Video — wie vorher
 *  8. Dateien & Zertifikate — wie vorher
 *  9. Instagram-Embeds — wie vorher
 * 10. Related Products — wie vorher
 * ────────────────────────────────────────────────────────────────────────── */
export default async function ProduktDetailPage({ params }: Props) {
  const { slug } = await params;
  const [produkt, { t }, kontakt, kaspiCfg, kaufenAktiv] = await Promise.all([
    oeffentlichesProduktBySlug(slug),
    getDictionary(),
    kontaktKanaeleLaden().catch(() => null),
    getKaspiConfig().catch(() => null),
    isFeatureEnabled("kaufen_aktiv").catch(() => true),
  ]);
  if (!produkt) notFound();

  const locale = await getLocale();
  const name   = i18nOr(produkt.name_i18n,             locale, produkt.name);
  const kurz   = i18nOr(produkt.kurzbeschreibung_i18n, locale, produkt.kurzbeschreibung);
  const lang   = i18nOr(produkt.beschreibung_i18n,     locale, produkt.beschreibung);
  const hatStory = (produkt.inhalt_blocks?.length ?? 0) > 0;

  const aehnliche = await aehnlicheProdukte(
    produkt.id,
    produkt.kategorie_id ?? null,
    produkt.preis,
    4
  ).catch(() => []);

  const instagramUrls = produkt.instagram_urls ?? [];
  const galerie = produkt.bilder ?? [];

  // Legacy hauptbild_url + rueckbild_url als virtuelle Bilder einfügen
  const extraBilder: typeof galerie = [];
  if (produkt.hauptbild_url) {
    extraBilder.push({
      id: "haupt", produkt_id: produkt.id, url: produkt.hauptbild_url,
      url_thumb: null, url_medium: null, url_large: null, format: null,
      alt_text: name, sortierung: -2, ist_hauptbild: true,
      breite: null, hoehe: null, dateigroesse: null, erstellt_am: produkt.erstellt_am,
    });
  }
  if (produkt.rueckbild_url) {
    extraBilder.push({
      id: "rueck", produkt_id: produkt.id, url: produkt.rueckbild_url,
      url_thumb: null, url_medium: null, url_large: null, format: null,
      alt_text: `${name} — обратная сторона`, sortierung: -1, ist_hauptbild: false,
      breite: null, hoehe: null, dateigroesse: null, erstellt_am: produkt.erstellt_am,
    });
  }
  const bilder = [
    ...extraBilder,
    ...galerie.filter(b => b.url !== produkt.hauptbild_url && b.url !== produkt.rueckbild_url),
  ];

  const waehrung = (produkt.waehrung as "KZT" | "EUR" | "USD" | "RUB" | undefined) ?? "KZT";

  // ── Kontakt-URLs vorbereiten (für Sidebar + Mobile-Strip) ─────────────
  const productUrl    = siteUrl(`/katalog/${produkt.slug}`);
  const waBaseUrl     = kontakt ? whatsappUrl(kontakt.whatsapp_nummer) : null;
  const waMessage     = whatsappMessage(name, formatPreis(produkt.preis, waehrung), productUrl);
  const waUrl         = waBaseUrl ? `${waBaseUrl}?text=${encodeURIComponent(waMessage)}` : null;
  const tgUrl         = kontakt ? telegramUrl(kontakt.telegram_channel) : null;
  const igUrl         = kontakt?.instagram_handle
    ? `https://instagram.com/${kontakt.instagram_handle.replace(/^@/, "")}`
    : null;

  // ── JSON-LD ───────────────────────────────────────────────────────────
  const allImages = bilder.map(b => b.url).filter(Boolean);
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

  // ── Spec-Items für Характеристики-Section ─────────────────────────────
  const specs = [
    produkt.kategorie_name && { label: "Категория",    value: produkt.kategorie_name },
    produkt.era            && { label: "Эпоха",         value: produkt.era },
    produkt.herkunft       && { label: "Происхождение", value: produkt.herkunft },
    produkt.material       && { label: "Материал",      value: produkt.material },
    produkt.abmessungen?.breite  && { label: "Ширина",  value: `${produkt.abmessungen.breite} см` },
    produkt.abmessungen?.hoehe   && { label: "Высота",  value: `${produkt.abmessungen.hoehe} см` },
    produkt.abmessungen?.tiefe   && { label: "Глубина", value: `${produkt.abmessungen.tiefe} см` },
    produkt.abmessungen?.gewicht && { label: "Вес",     value: `${produkt.abmessungen.gewicht} г` },
    produkt.artikel_code   && { label: "Артикул",       value: produkt.artikel_code },
  ].filter((x): x is { label: string; value: string } => Boolean(x));

  return (
    <div style={{ background: "var(--color-paper)", color: "var(--color-ink)" }}>
      <JsonLd id="product" data={[productJsonLd, breadcrumbJsonLd]} />

      {/* ── Breadcrumb-Bar ───────────────────────────────────────────── */}
      <div
        className="border-b"
        style={{ borderColor: "var(--color-line)", background: "var(--color-bone)" }}
      >
        <div className="max-w-[1440px] mx-auto px-5 md:px-14 py-3 flex items-center justify-between gap-4">
          <nav
            className="flex items-center gap-2 text-[11px] uppercase font-medium overflow-hidden"
            style={{ letterSpacing: "0.18em", color: "var(--color-ink-mute)" }}
          >
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
          <p
            className="text-[11px] uppercase font-medium hidden sm:block"
            style={{ letterSpacing: "0.18em", color: "var(--color-ink-mute)", fontFamily: "var(--font-mono)" }}
          >
            Лот {String(produkt.id).slice(0, 8).toUpperCase()}
          </p>
        </div>
      </div>

      {/* ── Title CENTERED above Gallery ─────────────────────────────── */}
      <div className="max-w-[1100px] mx-auto px-5 md:px-8 py-6 md:py-8 text-center">
        {produkt.kategorie_name && (
          <p
            className="text-[11px] uppercase font-medium mb-2 md:mb-3"
            style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
          >
            {produkt.kategorie_name}
          </p>
        )}
        <h1
          style={{
            fontFamily:    "var(--font-display)",
            fontSize:      "clamp(1.75rem, 4.5vw, 2.75rem)",
            lineHeight:    1.05,
            letterSpacing: "-0.005em",
            color:         "var(--color-ink)",
          }}
        >
          {name}
        </h1>
        {produkt.era && (
          <p
            className="mt-2 text-sm md:text-base"
            style={{
              fontFamily: "var(--font-italic)",
              fontStyle:  "italic",
              color:      "var(--color-ink-mute)",
            }}
          >
            {produkt.era}
          </p>
        )}
      </div>

      {/* ── FULL-WIDTH Gallery ───────────────────────────────────────── */}
      <div className="w-full">
        <div className="max-w-[1400px] mx-auto">
          <ImageGallery bilder={bilder} produktName={name} />
        </div>
      </div>

      {/* ── Mobile-only Quick-CTAs (vor dem Scroll sichtbar) ────────── */}
      {!produkt.verkauft && (waUrl || tgUrl) && (
        <div className="lg:hidden mx-4 mt-5">
          <div
            className="p-4 space-y-3"
            style={{
              background: "#FAFAF8",
              border:     "1px solid var(--color-line, rgba(44,36,32,0.08))",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize:   "1.75rem",
                  color:      "var(--color-ink)",
                  fontWeight: 500,
                  lineHeight: 1,
                }}
              >
                {formatPreis(produkt.preis, waehrung)}
              </p>
            </div>
            <div className="space-y-2">
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 font-body text-sm font-medium uppercase"
                  style={{
                    background:    "#25D366",
                    color:         "#fff",
                    letterSpacing: "0.1em",
                  }}
                >
                  <MessageCircle size={14} />
                  WhatsApp
                </a>
              )}
              <div className="flex gap-2">
                {tgUrl && (
                  <a
                    href={tgUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 font-body text-sm"
                    style={{ background: "#26A3EE", color: "#fff" }}
                  >
                    <Send size={13} />
                    Telegram
                  </a>
                )}
                <Link
                  href={`/kontakt?produkt=${produkt.id}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 font-body text-sm"
                  style={{ background: "var(--color-ink)", color: "var(--color-paper)" }}
                >
                  Написать
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2-Col: Accordion-Info (left, 2/3) + Sticky-Sidebar (right, 1/3) */}
      <section className="max-w-[1440px] mx-auto px-5 md:px-14 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">

          {/* ── LEFT: Accordion-Sections ──────────────────────────── */}
          <div className="lg:col-span-2 space-y-0">

            {/* Kurzbeschreibung (immer sichtbar oben) */}
            {kurz && (
              <p
                className="mb-6 text-[15px] md:text-base"
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

            {/* Beschreibung (Markdown) — nur wenn KEINE Story-Blöcke gepflegt sind */}
            {!hatStory && lang && (
              <ExpandableSection title="Описание" defaultOpen>
                <div
                  className="prose-vintage text-[14px] leading-relaxed"
                  style={{ color: "var(--color-ink-soft)" }}
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(lang) }}
                />
              </ExpandableSection>
            )}

            {/* Charakteristics */}
            {specs.length > 0 && (
              <ExpandableSection title="Характеристики" defaultOpen badge={specs.length}>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8">
                  {specs.map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between py-1.5"
                      style={{ borderBottom: "1px dashed rgba(44, 36, 32, 0.08)" }}
                    >
                      <dt className="font-body text-sm" style={{ color: "var(--color-ink-mute, rgba(44,36,32,0.5))" }}>
                        {label}
                      </dt>
                      <dd className="font-body text-sm font-medium text-right" style={{ color: "var(--color-ink, #2C2420)" }}>
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </ExpandableSection>
            )}

            {/* Состояние mit ConditionMeter */}
            <ExpandableSection title="Состояние">
              <ConditionMeter zustand={produkt.zustand} />
            </ExpandableSection>

            {/* Tags */}
            {produkt.tags?.length > 0 && (
              <ExpandableSection title="Теги" badge={produkt.tags.length}>
                <div className="flex flex-wrap gap-x-3 gap-y-2">
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
              </ExpandableSection>
            )}
          </div>

          {/* ── RIGHT: Sticky Sidebar ──────────────────────────────── */}
          <div className="lg:col-span-1">
            <ProduktDetailSidebar
              produkt={{
                id:            produkt.id,
                slug:          produkt.slug,
                name,
                preis:         produkt.preis,
                originalpreis: produkt.originalpreis,
                waehrung,
                verkauft:      produkt.verkauft,
                reserviert:    !!produkt.reserviert_bis && new Date(produkt.reserviert_bis) > new Date() && !produkt.verkauft,
                /* Schaufenster: exakten Bestand nicht in den Client-Payload geben. */
                lagerbestand:  kaufenAktiv ? produkt.lagerbestand : (produkt.lagerbestand > 0 ? 1 : 0),
                hauptbildUrl:  bilder[0]?.url ?? null,
                b2c_mode:      produkt.b2c_mode,
              }}
              kontakt={{
                whatsappUrl:  waUrl,
                telegramUrl:  tgUrl,
                instagramUrl: igUrl,
                email:        null,
                telefon:      kontakt?.whatsapp_nummer ?? null,
              }}
              versandHinweis="Доставка по Казахстану"
              kaufenAktiv={kaufenAktiv}
              kaspi={{
                aktiv: kaspiCfg ? kaspiKonfiguriert(kaspiCfg) : false,
                link:  null,  // Kaspi-Pay-Link wird im Checkout dynamisch erstellt
              }}
            />
          </div>
        </div>
      </section>

      {/* ── Story-Band (bone bg) — Long-Form Storytelling ─────────────
           Block-basierte Story hat Vorrang; sonst Fallback auf Markdown. */}
      {(hatStory || lang) && (
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
            {hatStory ? (
              <ProduktStory blocks={produkt.inhalt_blocks} locale={locale} />
            ) : (
              <div
                className="prose-vintage text-[15px] leading-relaxed md:columns-2 md:gap-8"
                style={{
                  fontFamily: "var(--font-italic)",
                  fontStyle:  "italic",
                  color:      "var(--color-ink-soft)",
                }}
                dangerouslySetInnerHTML={{ __html: markdownToHtml(lang) }}
              />
            )}
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

      {/* ── Instagram-Embeds ───────────────────────────────────── */}
      {instagramUrls.length > 0 && (
        <section
          className="max-w-[1440px] mx-auto px-5 md:px-14 py-12 md:py-16 border-t"
          style={{ borderColor: "var(--color-line)" }}
        >
          <InstagramEmbeds urls={instagramUrls} />
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
          <ProduktGrid produkte={maskBestandListe(aehnliche, kaufenAktiv)} prioCount={0} />
        </section>
      )}

    </div>
  );
}
