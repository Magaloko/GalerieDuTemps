import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { getLocale } from "@/i18n";

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

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://galeriedutemps.kz";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Galerie du Temps — Винтажные сокровища с историей",
    template: "%s | Galerie du Temps",
  },
  description:
    "Эксклюзивная коллекция винтажных вещей с историей. Мебель, декор, мода и аксессуары — тщательно отобраны и бережно восстановлены.",
  keywords: [
    "винтаж", "антиквариат", "ретро", "галерея",
    "Алматы", "Казахстан", "Almaty", "винтажные вещи",
    "Galerie du Temps", "vintage", "Kazakhstan",
  ],
  authors:  [{ name: "Galerie du Temps" }],
  creator:  "Galerie du Temps",
  publisher: "Galerie du Temps",
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type:           "website",
    locale:         "ru_RU",
    alternateLocale: ["ru_KZ", "kk_KZ", "en_US"],
    url:            BASE_URL,
    siteName:       "Galerie du Temps",
    title:          "Galerie du Temps — Винтажные сокровища с историей",
    description:    "Эксклюзивные винтажные находки. Алматы · Казахстан.",
    images:         [{ url: "/og-default.jpg", width: 1200, height: 630, alt: "Galerie du Temps" }],
  },
  twitter: {
    card:        "summary_large_image",
    title:       "Galerie du Temps",
    description: "Эксклюзивные винтажные находки с историей.",
    images:      ["/og-default.jpg"],
  },
  robots: {
    index:  true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon:     [{ url: "/favicon.ico" }],
    apple:    [{ url: "/apple-touch-icon.png" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${playfair.variable} ${inter.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
