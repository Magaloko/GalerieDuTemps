import Script from "next/script";
import { MiniAppTabBar } from "./tg/tab-bar";
import { ErudaLoader } from "./eruda-loader";
import { TelegramChrome } from "./telegram-chrome";
import { isFeatureEnabled } from "@/lib/db/feature-flags";

/* ──────────────────────────────────────────────────────────────────────────
 * Mini-App Layout — Telegram WebView
 *
 * BEWUSST OHNE SiteHeader, Footer, MobileTabBar, ChatWidget, CookieBanner —
 * Telegram bringt eigene Chrome (Back-Button oben, MainButton unten).
 *
 * Eigene Bottom-Tab-Bar (4 Tabs) als Navigation. Padding-bottom auf <main>
 * damit Inhalte nicht hinter der Bar landen.
 *
 * Theme: Telegram-WebView injiziert CSS-Variablen wie --tg-theme-bg-color
 * basierend auf User-Theme (hell/dunkel). Wir setzen unsere Tokens darauf
 * als CSS-Fallback, sodass die Mini-App auch im Browser-Fallback lesbar ist.
 *
 * Script-Tag <Script src="https://telegram.org/js/telegram-web-app.js" />
 * lädt window.Telegram.WebApp und seine Theme-Variablen automatisch.
 * ────────────────────────────────────────────────────────────────────────── */

export const metadata = {
  title: "Galerie du Temps",
  viewport: { width: "device-width", initialScale: 1, viewportFit: "cover" },
};

export default async function TelegramLayout({ children }: { children: React.ReactNode }) {
  const kaufenAktiv = await isFeatureEnabled("kaufen_aktiv").catch(() => true);
  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      <div
        className="min-h-[100dvh]"
        style={{
          // Spacer = MiniAppTabBar-Höhe inkl. Safe-Area (statt fixem pb-20,
          // das auf Notch-iPhones zu knapp ist → letzte Zeile hinter der Bar).
          paddingBottom: "var(--tg-tabbar-h)",
          background: "var(--tg-theme-bg-color, var(--color-paper))",
          color:      "var(--tg-theme-text-color, var(--color-ink))",
          fontFamily: "var(--font-sans)",
        }}
      >
        <TelegramChrome />
        {children}
        <MiniAppTabBar kaufenAktiv={kaufenAktiv} />
        <ErudaLoader />
      </div>
    </>
  );
}
