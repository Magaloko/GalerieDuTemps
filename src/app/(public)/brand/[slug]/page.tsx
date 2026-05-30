import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { brandBySlug, brandProdukte, brandJournal, brandInstagram } from "@/lib/db/brands";
import { LandingBlocks } from "@/components/landing/landing-blocks";
import { ProduktKarte } from "@/components/produkte/produkt-karte";
import { blockText } from "@/lib/utils/i18n-text";
import { getLocale } from "@/i18n";

export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * Öffentliche Brand-Page — Header + (nur-wenn-vorhanden) Sektionen:
 *   a) Intro-Blöcke (LandingBlocks)   b) Produkte-Grid (ProduktKarte)
 *   c) Journal-Liste                  d) Instagram-Grid   e) Videos (16:9)
 * Markenkonform (serif Headlines, Coral-Akzent, eckig, RU-Default).
 * ────────────────────────────────────────────────────────────────────────── */

/** YouTube/Vimeo/Direkt-Video → Embed (wie landing-blocks.tsx). */
function videoEmbed(url: string): { kind: "iframe" | "video"; src: string } | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return { kind: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeo[1]}` };
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return { kind: "video", src: url };
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const brand = await brandBySlug(slug, true);
  if (!brand) return { title: "Бренд не найден" };
  const locale = await getLocale();
  const desc = brand.seo_beschreibung || blockText(brand.beschreibung, locale) || undefined;
  return {
    title: brand.seo_titel || brand.name,
    description: desc,
  };
}

export default async function BrandPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const brand = await brandBySlug(slug, true);
  if (!brand) notFound();

  const [produkte, journal, instagram] = await Promise.all([
    brandProdukte(brand.id, 12).catch(() => []),
    brandJournal(brand.id, 6).catch(() => []),
    brandInstagram(brand.id, 12).catch(() => []),
  ]);

  const beschreibung = blockText(brand.beschreibung, locale);
  const videos = (brand.videos ?? []).filter((v) => v.url?.trim());

  return (
    <main className="w-full">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header
        className="relative w-full overflow-hidden flex items-center justify-center"
        style={{ minHeight: brand.cover_url ? "min(56vh, 460px)" : undefined, background: "var(--color-cobalt, #1B2566)" }}
      >
        {brand.cover_url && (
          <>
            <Image src={brand.cover_url} alt={brand.name} fill priority sizes="100vw" className="object-cover" />
            <div className="absolute inset-0" style={{ background: "rgba(15,20,48,0.55)" }} />
          </>
        )}
        <div className={`relative z-10 px-6 ${brand.cover_url ? "py-16" : "py-12"} max-w-3xl text-center`}>
          {brand.logo_url && (
            <div className="relative mx-auto mb-5 w-20 h-20 sm:w-28 sm:h-28 bg-white/90 flex items-center justify-center" style={{ borderRadius: 4 }}>
              <Image src={brand.logo_url} alt={brand.name} fill sizes="112px" className="object-contain p-3" />
            </div>
          )}
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 5vw, 3.25rem)", color: "#fff", lineHeight: 1.05 }}>
            {brand.name}
          </h1>
          {beschreibung && (
            <p className="mt-4 text-lg md:text-xl mx-auto max-w-2xl" style={{ color: "rgba(255,255,255,0.9)", lineHeight: 1.55 }}>
              {beschreibung}
            </p>
          )}
        </div>
      </header>

      {/* a) Intro-Blöcke */}
      {brand.intro_blocks && brand.intro_blocks.length > 0 && (
        <LandingBlocks blocks={brand.intro_blocks} locale={locale} />
      )}

      {/* b) Produkte */}
      {produkte.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14">
          <SektionTitel>Товары</SektionTitel>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {produkte.map((p) => <ProduktKarte key={p.id} produkt={p} />)}
          </div>
        </section>
      )}

      {/* c) Journal */}
      {journal.length > 0 && (
        <div className="w-full" style={{ background: "var(--color-bone)" }}>
        <section className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14">
          <SektionTitel>Журнал</SektionTitel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {journal.map((post) => (
              <Link key={post.id} href={`/journal/${post.slug}`}
                className="group block border border-[var(--color-line)] bg-white overflow-hidden hover:border-vintage-brown transition-colors"
                style={{ borderRadius: "var(--radius-card)" }}>
                {post.cover_bild_url && (
                  <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3/2", background: "var(--color-paper-warm, #E8DFD0)" }}>
                    <Image src={post.cover_bild_url} alt={post.titel} fill sizes="(max-width:768px) 100vw, 400px" className="object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-serif text-lg text-vintage-espresso leading-snug">{post.titel}</h3>
                  {post.excerpt && <p className="mt-1.5 text-sm" style={{ color: "var(--color-ink-soft)", lineHeight: 1.6 }}>{post.excerpt}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
        </div>
      )}

      {/* d) Instagram */}
      {instagram.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14">
          <SektionTitel>Instagram</SektionTitel>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
            {instagram.map((post) => {
              const cover = post.thumbnail_url || post.produkt_bild_url || null;
              return (
                <a key={post.id} href={post.permalink} target="_blank" rel="noopener noreferrer"
                  className="relative block overflow-hidden group" style={{ aspectRatio: "1/1", background: "var(--color-paper-warm, #E8DFD0)" }}>
                  {cover ? (
                    <Image src={cover} alt={post.titel ?? ""} fill sizes="(max-width:768px) 50vw, 300px" className="object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-vintage-dust text-xs">{post.shortcode}</div>
                  )}
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* e) Videos */}
      {videos.length > 0 && (
        <div className="w-full" style={{ background: "var(--color-bone)" }}>
        <section className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14">
          <SektionTitel>Видео</SektionTitel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {videos.map((v, i) => {
              const embed = videoEmbed(v.url);
              if (!embed) return null;
              return (
                <figure key={i} className="space-y-2">
                  <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9", background: "#000" }}>
                    {embed.kind === "iframe" ? (
                      <iframe src={embed.src} className="absolute inset-0 w-full h-full" style={{ border: 0 }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen title={v.titel ?? "Видео"} />
                    ) : (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video src={embed.src} controls className="absolute inset-0 w-full h-full object-contain" />
                    )}
                  </div>
                  {v.titel && <figcaption className="text-sm" style={{ color: "var(--color-ink-soft)" }}>{v.titel}</figcaption>}
                </figure>
              );
            })}
          </div>
        </section>
        </div>
      )}
    </main>
  );
}

function SektionTitel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-6" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", color: "var(--color-ink)", borderBottom: "2px solid var(--color-coral)", display: "inline-block", paddingBottom: 4 }}>
      {children}
    </h2>
  );
}
