import type { Metadata } from "next";

import { HeroReveal } from "@/components/home/hero-reveal";
import { ManifestoSection } from "@/components/home/manifesto-section";
import { FeaturedCollection } from "@/components/home/featured-collection";
import { CuratedEditions } from "@/components/home/curated-editions";
import { TestimonialSection } from "@/components/home/testimonial-section";
import { CTABanner } from "@/components/home/cta-banner";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { CookieBanner } from "@/components/cookie-banner";
import { ChatWidget } from "@/components/ai/chat-widget";

import { featuredProdukte } from "@/lib/db/produkte-public";
import { getDictionary } from "@/i18n";
import { formatPreis } from "@/lib/utils/preis";

export const metadata: Metadata = {
  title:       "Galerie du Temps — Винтажные сокровища с историей",
  description: "Кураторская подборка винтажных вещей. Алматы, Казахстан.",
};

export const revalidate = 3600;

const heroImages = [
  "/images/hero-stack-1.jpg",
  "/images/hero-stack-2.jpg",
  "/images/hero-stack-3.jpg",
  "/images/hero-stack-4.jpg",
  "/images/hero-stack-5.jpg",
];

/* ──────────────────────────────────────────────────────────────────────────
 * Home — Editorial v2 (Lenis-Smooth + GSAP-ScrollTrigger).
 *
 *   HeroReveal       → pinned, scroll-driven image-stack
 *   Manifesto        → 2-col, scroll-fade-in
 *   FeaturedCollection → hero + 3-up grid (live DB-Produkte)
 *   CuratedEditions  → cobalt block, journal teasers
 *   TestimonialSection
 *   CTABanner
 *
 * SiteHeader/Footer/MobileTabBar bleiben wie überall im Projekt.
 * Wenn featuredProdukte() leer/fehler liefert, fallen Hero-Stack-Bilder als
 * Platzhalter im FeaturedCollection ein — kein Crash.
 * ────────────────────────────────────────────────────────────────────────── */
export default async function HomePage() {
  const [produkte, dict] = await Promise.all([
    featuredProdukte(8).catch(() => []),
    getDictionary(),
  ]);
  const { t } = dict;

  // Mapping DB-Produkt → FeaturedCollection-Props.
  // Wichtig: KEIN Fallback auf zufällige Hero-Stack-Bilder mehr — sonst zeigt
  // Featured-Section ein irreführendes Cover wenn der Admin ein Produkt
  // promotet bevor ein Bild hochgeladen wurde. FeaturedCollection rendert
  // einen sauberen "Без фото" Placeholder wenn image === null.
  const featuredProducts = produkte.map((p) => ({
    id:       String(p.id),
    name:     p.name,
    price:    formatPreis(p.preis, (p.waehrung as "KZT" | "EUR" | "USD" | "RUB" | undefined) ?? "KZT"),
    image:    p.hauptbild_url ?? null,
    slug:     p.slug,
    category: p.kategorie_name ?? undefined,
  }));

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--color-paper)" }}>
      <SiteHeader />
      <main className="flex-1 pb-24 md:pb-0">
        <HeroReveal
          images={heroImages}
          kicker="Кураторский винтаж с 2015"
          title="Редкие вещи"
          titleAccent="с историей."
          subtitle="Кураторская подборка винтажа — мебель, керамика, графика, текстиль. Каждый предмет проходит атрибуцию и реставрацию."
        />

        <ManifestoSection />

        {featuredProducts.length > 0 && (
          <FeaturedCollection products={featuredProducts} />
        )}

        <CuratedEditions />

        <TestimonialSection />

        <CTABanner />
      </main>
      <SiteFooter />
      <MobileTabBar t={t} />
      <ChatWidget />
      <CookieBanner />
    </div>
  );
}
