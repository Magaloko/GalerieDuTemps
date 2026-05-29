import type { Metadata, Viewport } from "next";
import {
  Playfair_Display,
  Inter,
  Italiana,
  Cormorant_Garamond,
  JetBrains_Mono,
  Source_Sans_3,
} from "next/font/google";
import "./globals.css";
import { getLocale } from "@/i18n";
import { JsonLd } from "@/components/seo/json-ld";
import { storeSchema, websiteSchema } from "@/lib/seo/schemas";
import { systemEinstellungenLaden } from "@/lib/db/system-einstellungen";
import { kontaktKanaeleLaden, whatsappUrl, telegramUrl, instagramUrl } from "@/lib/db/kontakt-kanaele";
import { renderThemeCssVars, getThemeBranding } from "@/lib/db/theme";
import { LenisProvider } from "@/components/providers/lenis-provider";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { ToastProvider } from "@/components/ui/toast-provider";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "cyrillic"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

// Italiana: Latin-only auf Google Fonts. Wird nur für GALERIE-Wordmark und
// rein-lateinische Display-Headlines benutzt. Russische Display-Headlines
// nutzen Cormorant (das Cyrillic hat).
const italiana = Italiana({
  variable: "--font-italiana",
  subsets:  ["latin"],
  display:  "swap",
  weight:   ["400"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets:  ["latin", "cyrillic"],
  display:  "swap",
  weight:   ["300", "400", "500"],
  style:    ["normal", "italic"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets:  ["latin", "cyrillic"],
  display:  "swap",
  weight:   ["400", "500"],
});

// Source Sans 3 — Body-Font für die neue Startseite-Komponenten
// (var(--font-body) in globals.css). Cyrillic-Subset weil RU-Primärsprache.
const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets:  ["latin", "cyrillic"],
  display:  "swap",
  weight:   ["400", "500", "600"],
});

import { getSiteUrl } from "@/lib/site-url";
const BASE_URL = getSiteUrl();

/* metadata-Vorlage:
 * - title.default greift auf der Root-Page (/), title.template auf allen Subseiten.
 *   Subseiten setzen nur ihren reinen Namen, das Template fügt " | Galerie du Temps" an.
 * - openGraph.images + twitter.images werden NICHT mehr hier gesetzt — Next.js
 *   findet src/app/opengraph-image.tsx und src/app/twitter-image.tsx automatisch
 *   und generiert die Tags inkl. korrekter absoluter URL (via metadataBase).
 * - alternates.canonical wird per Page gesetzt (z.B. via { alternates: { canonical: "/katalog" } }).
 */
export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Galerie du Temps — Винтажные сокровища с историей",
    template: "%s | Galerie du Temps",
  },
  description:
    "Эксклюзивная коллекция винтажных вещей с историей. Мебель, декор, мода и аксессуары — тщательно отобраны и бережно восстановлены.",
  applicationName: "Galerie du Temps",
  authors:  [{ name: "Galerie du Temps" }],
  creator:  "Galerie du Temps",
  publisher: "Galerie du Temps",
  formatDetection: { email: false, address: false, telephone: false },
  alternates: {
    canonical: "/",
    languages: {
      ru: "/",
      en: "/",
      de: "/",
    },
  },
  openGraph: {
    type:            "website",
    locale:          "ru_RU",
    alternateLocale: ["ru_KZ", "kk_KZ", "en_US"],
    url:             BASE_URL,
    siteName:        "Galerie du Temps",
    title:           "Galerie du Temps — Винтажные сокровища с историей",
    description:     "Эксклюзивные винтажные находки. Алматы · Казахстан.",
  },
  twitter: {
    card:        "summary_large_image",
    title:       "Galerie du Temps",
    description: "Эксклюзивные винтажные находки с историей.",
  },
  robots: {
    index:  true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon:  [{ url: "/favicon.ico" }],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  // PWA: iOS-Standalone-Verhalten („Zum Home-Bildschirm"). Das <link rel=manifest>
  // generiert Next automatisch aus app/manifest.ts.
  appleWebApp: {
    capable:        true,
    title:          "Galerie",
    statusBarStyle: "black-translucent",
  },
};

// themeColor/viewport: in Next 16 separater Export (nicht mehr in metadata).
export const viewport: Viewport = {
  themeColor:   "#1B2566",
  colorScheme:  "light",
  width:        "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Locale, Firma-Stammdaten, Kontakt-Kanäle, Theme parallel laden.
  // Bei DB-Ausfall fallen wir auf Minimal-Schema + Code-Default-Theme zurück.
  const [locale, sys, kontakt, themeCss, branding] = await Promise.all([
    getLocale(),
    systemEinstellungenLaden().catch(() => null),
    kontaktKanaeleLaden().catch(() => null),
    renderThemeCssVars().catch(() => ""),
    getThemeBranding().catch(() => null),
  ]);
  void branding;  // Reserviert: Favicon-Override + Logo-Komponente lesen es separat.

  const sameAs = [
    kontakt && instagramUrl(kontakt.instagram_handle),
    kontakt && telegramUrl(kontakt.telegram_channel),
    kontakt && whatsappUrl(kontakt.whatsapp_nummer),
  ].filter((x): x is string => Boolean(x));

  const orgJsonLd = storeSchema({
    address: sys ? {
      street:     sys.firma_strasse || undefined,
      postalCode: sys.firma_plz     || undefined,
      locality:   sys.firma_ort     || "Алматы",
      country:    sys.firma_land    || "KZ",
    } : { locality: "Алматы", country: "KZ" },
    email:     sys?.firma_email   || "bonjour@galeriedutemps.kz",
    telephone: sys?.firma_telefon || undefined,
    sameAs,
  });
  const siteJsonLd = websiteSchema();

  return (
    <html
      lang={locale}
      className={`${playfair.variable} ${inter.variable} ${italiana.variable} ${cormorant.variable} ${jetbrains.variable} ${sourceSans.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        {/* Theme-Override aus DB (editierbar in /admin/einstellungen/design).
            Body-Injection statt <head>: vermeidet React-19-Hydration-Mismatch
            in <head> (whitespace-text-node + conditional). :root-Selector
            funktioniert von überall, Cascade-Sieg über globals.css bleibt. */}
        {themeCss ? <style dangerouslySetInnerHTML={{ __html: themeCss }} /> : null}
        <JsonLd id="org-site" data={[orgJsonLd, siteJsonLd]} />
        <ServiceWorkerRegister />
        <ToastProvider>
          <LenisProvider>{children}</LenisProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
