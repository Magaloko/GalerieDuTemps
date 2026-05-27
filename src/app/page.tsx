import type { Metadata } from "next";

import { HeroEditorial } from "@/components/home/hero-editorial";
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
import { FeatureGate } from "@/components/feature-gate";

import { featuredProdukte } from "@/lib/db/produkte-public";
import { getMarketingStrings } from "@/lib/db/marketing-strings";
import { getDictionary, getLocale } from "@/i18n";
import { formatPreis } from "@/lib/utils/preis";

export const metadata: Metadata = {
  title:       "Galerie du Temps — Винтажные сокровища с историей",
  description: "Кураторская подборка винтажных вещей. Алматы, Казахстан.",
};

export const revalidate = 3600;

/* ──────────────────────────────────────────────────────────────────────────
 * Home — Editorial v3
 *
 *   HeroEditorial    → full-screen Hintergrund-Bild/Video, kein Pin
 *                       Konfigurierbar via marketing_strings (home.hero.*)
 *   Manifesto        → 2-col, scroll-fade-in
 *   FeaturedCollection → hero + 3-up grid (live DB-Produkte)
 *   CuratedEditions  → cobalt block, journal teasers
 *   TestimonialSection
 *   CTABanner
 *
 * Hero-Hintergrund kommt aus marketing_strings.home.hero.background_url.
 * Admin kann jederzeit ändern unter /admin/einstellungen/marketing.
 * Falls Bild eine Video-Endung hat (.mp4/.webm/.mov), wird's als Video
 * gerendert (autoplay/muted/loop).
 * ────────────────────────────────────────────────────────────────────────── */
export default async function HomePage() {
  const locale = await getLocale();

  const [produkte, dict, heroStrings] = await Promise.all([
    featuredProdukte(8).catch(() => []),
    getDictionary(),
    getMarketingStrings(
      [
        "home.hero.background_url",
        "home.hero.background_poster",
        "home.hero.eyebrow",
        "home.hero.h1_oben",
        "home.hero.h1_unten",
        "home.hero.subhead",
        "home.hero.cta_primary",
        "home.hero.cta_secondary",
      ],
      locale,
    ).catch(() => ({} as Record<string, string>)),
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
        <HeroEditorial
          backgroundUrl    = {heroStrings["home.hero.background_url"]     || "/images/hero-stack-1.jpg"}
          backgroundPoster = {heroStrings["home.hero.background_poster"]  || undefined}
          kicker           = {heroStrings["home.hero.eyebrow"]            || "Кураторский винтаж с 2015"}
          title            = {heroStrings["home.hero.h1_oben"]            || "Редкие вещи"}
          titleAccent      = {heroStrings["home.hero.h1_unten"]           || "с историей."}
          subtitle         = {heroStrings["home.hero.subhead"]            || "Кураторская подборка винтажа — мебель, керамика, графика, текстиль."}
          ctaPrimaryLabel  = {heroStrings["home.hero.cta_primary"]        || "Открыть каталог"}
          ctaPrimaryHref   = "/katalog"
          ctaSecondaryLabel= {heroStrings["home.hero.cta_secondary"]      || undefined}
          ctaSecondaryHref = "/assistent"
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
