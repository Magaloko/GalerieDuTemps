import { notFound } from "next/navigation";
import { oeffentlichesProduktBySlug, aehnlicheProdukte } from "@/lib/db/produkte-public";
import { ProduktGrid } from "@/components/produkte/produkt-grid";
import { ProduktDetailClient } from "./client";
import { AddToCartButton } from "@/components/produkte/add-to-cart-button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { formatPreis } from "@/lib/utils/preis";
import { markdownToHtml } from "@/lib/utils/markdown";
import { i18nOr } from "@/lib/utils/i18n-text";
import { ZustandBadge } from "@/components/ui/badge";
import type { Metadata } from "next";
import { getDictionary, getLocale } from "@/i18n";

interface Props { params: Promise<{ slug: string }> }

function videoEmbedSrc(url: string): { type: "iframe" | "video"; src: string } | null {
  // YouTube
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return { type: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  // Vimeo
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return { type: "iframe", src: `https://player.vimeo.com/video/${vm[1]}` };
  // direkt MP4/WebM
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
    title:       p.seo_titel        ?? `${lokalName} – Galerie du Temps`,
    description: p.seo_beschreibung ?? lokalKurz ?? undefined,
  };
}

export default async function ProduktDetailPage({ params }: Props) {
  const { slug } = await params;
  const [produkt, { t }] = await Promise.all([
    oeffentlichesProduktBySlug(slug),
    getDictionary(),
  ]);
  if (!produkt) notFound();

  // Lokalisierte Texte (i18n-JSONB → fallback auf Default-Spalte)
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

  // Haupt-/Rückbild aus Produkt-Spalten als virtuelle Galerie-Einträge voranstellen
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-sans text-vintage-dust mb-8">
        <Link href="/katalog" className="hover:text-vintage-cream/80 transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> {t.nav.katalog}
        </Link>
        {produkt.kategorie_name && (
          <>
            <span>/</span>
            <span>{produkt.kategorie_name}</span>
          </>
        )}
        <span>/</span>
        <span className="text-vintage-cream truncate max-w-48">{name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-12 xl:gap-16">
        {/* ─── Bildbereich (Client Component für Galerie-Interaktion) ── */}
        <ProduktDetailClient bilder={bilder} produktName={name} />

        {/* ─── Info ─────────────────────────────────────────────────── */}
        <div className="space-y-6">
          {produkt.kategorie_name && (
            <p className="text-vintage-dust text-xs font-sans uppercase tracking-widest">
              {produkt.kategorie_name}
            </p>
          )}

          <div>
            <h1 className="font-serif text-3xl md:text-4xl text-vintage-cream leading-tight">
              {name}
            </h1>
            {produkt.era && (
              <p className="text-vintage-dust text-sm font-sans mt-1">{produkt.era}</p>
            )}
          </div>

          {/* Preis */}
          <div className="flex items-end gap-3">
            <p className="font-serif text-3xl text-vintage-cream">
              {formatPreis(produkt.preis)}
            </p>
            {produkt.originalpreis && (
              <p className="text-vintage-dust text-lg line-through mb-0.5">
                {formatPreis(produkt.originalpreis)}
              </p>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-wrap gap-3">
            <ZustandBadge zustand={produkt.zustand} />
            {produkt.herkunft && (
              <span className="text-xs font-sans text-vintage-dust border border-vintage-sand/40 px-2 py-0.5" style={{ borderRadius: "var(--radius-vintage)" }}>
                {produkt.herkunft}
              </span>
            )}
            {produkt.material && (
              <span className="text-xs font-sans text-vintage-dust border border-vintage-sand/40 px-2 py-0.5" style={{ borderRadius: "var(--radius-vintage)" }}>
                {produkt.material}
              </span>
            )}
          </div>

          {/* Kurzbeschreibung */}
          {kurz && (
            <p className="text-vintage-cream/80 leading-relaxed font-sans">
              {kurz}
            </p>
          )}

          {/* Beschreibung */}
          {lang && (
            <div className="border-t border-vintage-sand/40 pt-5">
              <p className="text-xs font-sans uppercase tracking-widest text-vintage-dust mb-3">{t.produkt.beschreibung}</p>
              <div
                className="prose-vintage text-sm"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(lang) }}
              />
            </div>
          )}

          {/* Add-to-Cart (primary) */}
          <div className="space-y-3">
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
              className="
                inline-flex items-center gap-2 w-full justify-center
                px-6 py-2.5 border border-vintage-sand/40 text-vintage-cream/80
                font-sans text-xs tracking-widest uppercase
                hover:bg-vintage-brown/40 transition-colors
              "
              style={{ borderRadius: "var(--radius-button)" }}
            >
              {t.produkt.kontakt}
            </Link>
          </div>

          {/* Tags */}
          {produkt.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {produkt.tags.map(tag => (
                <Link
                  key={tag}
                  href={`/katalog?suche=${encodeURIComponent(tag)}`}
                  className="text-xs font-sans text-vintage-dust hover:text-vintage-cream/80 transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Video ──────────────────────────────────────────────── */}
      {produkt.video_url && (() => {
        const embed = videoEmbedSrc(produkt.video_url);
        if (!embed) return null;
        return (
          <div className="mt-12 pt-8 border-t border-vintage-sand/40">
            <p className="text-vintage-gold text-xs tracking-widest uppercase mb-3">✦ Видео</p>
            <div
              className="relative w-full overflow-hidden bg-vintage-ink border border-vintage-sand/40"
              style={{ borderRadius: "var(--radius-card)", aspectRatio: "16 / 9" }}
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
          </div>
        );
      })()}

      {/* ─── Dateien & Zertifikate ──────────────────────────────── */}
      {((produkt.dateien?.length ?? 0) > 0 || (produkt.zertifikate?.length ?? 0) > 0) && (
        <div className="mt-12 pt-8 border-t border-vintage-sand/40 grid md:grid-cols-2 gap-8">
          {(produkt.dateien?.length ?? 0) > 0 && (
            <div>
              <p className="text-vintage-gold text-xs tracking-widest uppercase mb-3">✦ Документы</p>
              <div className="space-y-2">
                {produkt.dateien!.map(d => (
                  <a
                    key={d.id}
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 px-4 py-3 bg-vintage-brown/30 border border-vintage-sand/30 hover:border-vintage-gold/50 hover:bg-vintage-brown/50 transition-colors"
                    style={{ borderRadius: "var(--radius-vintage)" }}
                  >
                    <span className="text-sm font-sans text-vintage-cream truncate">📄 {d.name}</span>
                    {d.dateigroesse && (
                      <span className="text-xs text-vintage-dust flex-shrink-0">
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
              <p className="text-vintage-gold text-xs tracking-widest uppercase mb-3">✦ Сертификаты</p>
              <div className="space-y-2">
                {produkt.zertifikate!.map(z => (
                  <a
                    key={z.id}
                    href={z.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-3 bg-vintage-gold/5 border border-vintage-gold/30 hover:bg-vintage-gold/10 transition-colors"
                    style={{ borderRadius: "var(--radius-vintage)" }}
                  >
                    <p className="text-sm font-serif text-vintage-cream">{z.name}</p>
                    {(z.aussteller || z.datum) && (
                      <p className="text-xs text-vintage-dust font-sans mt-0.5">
                        {[z.aussteller, z.datum].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Ähnliche Produkte ──────────────────────────────────────── */}
      {aehnliche.length > 0 && (
        <div className="mt-20 pt-12 border-t border-vintage-sand/40">
          <div className="mb-8">
            <p className="text-vintage-gold text-xs tracking-widest uppercase mb-1">✦</p>
            <h2 className="font-serif text-2xl text-vintage-cream">{t.produkt.aehnlich}</h2>
          </div>
          <ProduktGrid produkte={aehnliche} prioCount={0} />
        </div>
      )}
    </div>
  );
}
