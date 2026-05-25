import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://galeriedutemps.kz";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Galerie du Temps – Einzigartige Vintage-Stücke",
    template: "%s | Galerie du Temps",
  },
  description:
    "Entdecke handverlesene Vintage-Schätze aus vergangenen Jahrzehnten. Möbel, Deko, Mode und mehr.",
  keywords: ["vintage", "antiquitäten", "retro", "secondhand", "upcycling"],
  authors:  [{ name: "Galerie du Temps" }],
  creator:  "Galerie du Temps",
  publisher: "Galerie du Temps",
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type:        "website",
    locale:      "de_DE",
    url:         BASE_URL,
    siteName:    "Galerie du Temps",
    title:       "Galerie du Temps – Einzigartige Vintage-Stücke",
    description: "Handverlesene Vintage-Schätze mit Geschichte.",
    images:      [{ url: "/og-default.jpg", width: 1200, height: 630, alt: "Galerie du Temps" }],
  },
  twitter: {
    card:        "summary_large_image",
    title:       "Galerie du Temps",
    description: "Handverlesene Vintage-Schätze mit Geschichte.",
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="de"
      className={`${playfair.variable} ${inter.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
