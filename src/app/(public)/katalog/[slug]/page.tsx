import { notFound } from "next/navigation";
import { oeffentlichesProduktBySlug, aehnlicheProdukte } from "@/lib/db/produkte-public";
import { ProduktGrid } from "@/components/produkte/produkt-grid";
import { ProduktDetailClient } from "./client";
import { AddToCartButton } from "@/components/produkte/add-to-cart-button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { formatPreis } from "@/lib/utils/preis";
import { ZustandBadge } from "@/components/ui/badge";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await oeffentlichesProduktBySlug(slug);
  if (!p) return { title: "Товар не найден" };
  return {
    title:       p.seo_titel        ?? `${p.name} – Galerie du Temps`,
    description: p.seo_beschreibung ?? p.kurzbeschreibung ?? undefined,
  };
}

export default async function ProduktDetailPage({ params }: Props) {
  const { slug } = await params;
  const [produkt, { t }] = await Promise.all([
    oeffentlichesProduktBySlug(slug),
    getDictionary(),
  ]);
  if (!produkt) notFound();

  const aehnliche = await aehnlicheProdukte(
    produkt.id,
    produkt.kategorie_id ?? null,
    produkt.preis,
    4
  ).catch(() => []);

  const bilder = produkt.bilder ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-sans text-vintage-dust mb-8">
        <Link href="/katalog" className="hover:text-vintage-brown transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> {t.nav.katalog}
        </Link>
        {produkt.kategorie_name && (
          <>
            <span>/</span>
            <span>{produkt.kategorie_name}</span>
          </>
        )}
        <span>/</span>
        <span className="text-vintage-ink truncate max-w-48">{produkt.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-12 xl:gap-16">
        {/* ─── Bildbereich (Client Component für Galerie-Interaktion) ── */}
        <ProduktDetailClient bilder={bilder} produktName={produkt.name} />

        {/* ─── Info ─────────────────────────────────────────────────── */}
        <div className="space-y-6">
          {produkt.kategorie_name && (
            <p className="text-vintage-dust text-xs font-sans uppercase tracking-widest">
              {produkt.kategorie_name}
            </p>
          )}

          <div>
            <h1 className="font-serif text-3xl md:text-4xl text-vintage-espresso leading-tight">
              {produkt.name}
            </h1>
            {produkt.era && (
              <p className="text-vintage-dust text-sm font-sans mt-1">{produkt.era}</p>
            )}
          </div>

          {/* Preis */}
          <div className="flex items-end gap-3">
            <p className="font-serif text-3xl text-vintage-espresso">
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
              <span className="text-xs font-sans text-vintage-dust border border-vintage-sand px-2 py-0.5" style={{ borderRadius: "var(--radius-vintage)" }}>
                {produkt.herkunft}
              </span>
            )}
            {produkt.material && (
              <span className="text-xs font-sans text-vintage-dust border border-vintage-sand px-2 py-0.5" style={{ borderRadius: "var(--radius-vintage)" }}>
                {produkt.material}
              </span>
            )}
          </div>

          {/* Kurzbeschreibung */}
          {produkt.kurzbeschreibung && (
            <p className="text-vintage-brown leading-relaxed font-sans">
              {produkt.kurzbeschreibung}
            </p>
          )}

          {/* Beschreibung */}
          {produkt.beschreibung && (
            <div className="border-t border-vintage-sand pt-5">
              <p className="text-xs font-sans uppercase tracking-widest text-vintage-dust mb-3">{t.produkt.beschreibung}</p>
              <div className="text-vintage-ink font-sans leading-relaxed whitespace-pre-line text-sm">
                {produkt.beschreibung}
              </div>
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
              taxRate={19}
              lagerbestand={produkt.lagerbestand}
              verkauft={produkt.verkauft}
            />
            <Link
              href={`/kontakt?produkt=${produkt.id}`}
              className="
                inline-flex items-center gap-2 w-full justify-center
                px-6 py-2.5 border border-vintage-sand text-vintage-brown
                font-sans text-xs tracking-widest uppercase
                hover:bg-vintage-parchment transition-colors
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
                  className="text-xs font-sans text-vintage-dust hover:text-vintage-brown transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Ähnliche Produkte ──────────────────────────────────────── */}
      {aehnliche.length > 0 && (
        <div className="mt-20 pt-12 border-t border-vintage-sand">
          <div className="mb-8">
            <p className="text-vintage-gold text-xs tracking-widest uppercase mb-1">✦</p>
            <h2 className="font-serif text-2xl text-vintage-espresso">{t.produkt.aehnlich}</h2>
          </div>
          <ProduktGrid produkte={aehnliche} prioCount={0} />
        </div>
      )}
    </div>
  );
}
