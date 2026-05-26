import Script from "next/script";

/* ──────────────────────────────────────────────────────────────────────────
 * Mini-App Layout — Telegram WebView
 *
 * BEWUSST OHNE SiteHeader, Footer, MobileTabBar, ChatWidget, CookieBanner.
 * Telegram bringt eigene Chrome (Back-Button oben, MainButton unten).
 *
 * Theme: Telegram-WebView injiziert CSS-Variablen wie --tg-theme-bg-color
 * basierend auf User-Theme (hell/dunkel). Wir setzen unsere Tokens darauf
 * als CSS-Fallback, sodass die Mini-App in beiden Themes lesbar ist.
 *
 * Script-Tag <Script src="https://telegram.org/js/telegram-web-app.js" />
 * lädt window.Telegram.WebApp und seine Theme-Variablen automatisch.
 * ────────────────────────────────────────────────────────────────────────── */

export const metadata = {
  title: "Galerie du Temps",
  // Telegram-WebView ignoriert viewport-Meta, aber für Browser-Fallback OK.
  viewport: { width: "device-width", initialScale: 1, viewportFit: "cover" },
};

export default function TelegramLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      <div
        className="min-h-[100dvh]"
        style={{
          // Telegram-Theme-Variables mit unseren Brand-Tokens als Fallback.
          // Hell-Theme: paper-bg; Dunkel-Theme: cobalt.
          background: "var(--tg-theme-bg-color, var(--color-paper))",
          color:      "var(--tg-theme-text-color, var(--color-ink))",
          fontFamily: "var(--font-sans)",
        }}
      >
        {children}
      </div>
    </>
  );
}
