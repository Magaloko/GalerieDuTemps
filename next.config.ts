import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Standalone-Output für Docker (minimales Production-Image)
  output: "standalone",

  // sharp hat native Binaries (libvips) die NICHT durch Webpack bundlen sollen
  // — sonst gehen die platform-spezifischen .node-Dateien in der Coolify-
  // Standalone-Build verloren und Image-Uploads crashen mit "sharp not found".
  serverExternalPackages: ["sharp"],

  // Turbopack: NFT-Warnung für /api/uploads unterdrücken.
  // Die Route nutzt process.cwd() als Dev-Fallback — in Production ist
  // UPLOAD_DIR immer gesetzt, sodass cwd() nie erreicht wird.
  turbopack: {
    ignoreIssue: [
      {
        // Unterdrückt "Encountered unexpected file in NFT list" für den
        // Upload-Route-Handler (filesystem-reads sind hier gewollt)
        path: "**/api/uploads/**",
      },
    ],
  },

  // Bilder-Domains
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname:  "*.apps.dadakaev.tech",
        pathname:  "/uploads/**",
      },
      // Supabase Storage (aktives Backend für Produktfotos).
      // Produktbilder liegen als
      //   https://<projectref>.supabase.co/storage/v1/object/public/<bucket>/...
      // next/image MUSS diesen Host erlauben, sonst werden alle Fotos
      // blockiert (broken image) — der Mini-App-Editor nutzt ein nacktes
      // <img> und zeigt sie trotzdem, der Katalog/die Produktseite (next/image)
      // aber nicht.
      {
        protocol: "https",
        hostname:  "*.supabase.co",
        pathname:  "/storage/v1/object/public/**",
      },
    ],
    // Bildformate optimieren
    formats: ["image/avif", "image/webp"],
    // Lokale Uploads + statische Brand-Bilder unter /images/* (Hero-Stack, Journal)
    localPatterns: [
      {
        pathname: "/uploads/**",
        search:   "",
      },
      {
        pathname: "/images/**",
        search:   "",
      },
    ],
  },

  // Logging in Development
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },

  // Sicherheits-Header (zusätzlich zu Caddy)
  async headers() {
    // Bewusst KEIN restriktives script-src/style-src: Next.js-SSR-Hydration,
    // Stripe.js, Telegram-WebApp-Script und Sentry nutzen Inline-Scripts; ein
    // strenges script-src bräuchte Nonce-Middleware + Live-Test (separater
    // Follow-up). Eingeschränkt werden nur ungefährliche, nicht-brechende
    // Direktiven. frame-ancestors erlaubt Telegram-Web (Mini-App wird dort
    // geframed) + self (Theme-Customizer-iframe) — daher KEIN X-Frame-Options
    // (das kann keine Origin-Whitelist und würde Telegram-Web blocken).
    // BEWUSST KEIN default-src: ohne default-src bleiben nicht-gelistete
    // Direktiven (script-src/style-src/img-src/connect-src) unbeschränkt — so
    // laden Next-Hydration, Stripe, Supabase-Bilder, Sentry & Telegram weiter.
    // KEIN frame-ancestors: Telegram lädt die Mini-App je nach Client in einem
    // Frame/WebView mit teils nicht-deterministischer Ancestor-Origin — eine
    // Whitelist riskiert, dass die App gar nicht rendert. Clickjacking-Schutz
    // hier bewusst zugunsten der Verfügbarkeit zurückgestellt.
    const csp = [
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; ");
    // Authentifizierte, nutzer-spezifische Antworten dürfen NIE in einem
    // geteilten Cache (CDN/Proxy/Telegram-WebView) landen — sonst kann ein
    // anderer Account die gecachte Admin-/Kunden-Antwort sehen (z.B. die
    // whoami-Identität oder eine gerenderte Admin-Seite). `private, no-store`
    // verbietet jegliches Caching. Betrifft die komplette Mini-App + alle
    // Telegram-API-Routen (alle sind sitzungs-/identitätsabhängig).
    const noStore = "private, no-store, max-age=0, must-revalidate";
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control",   value: "on" },
          { key: "X-Content-Type-Options",   value: "nosniff" },
          { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",       value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
          { key: "Content-Security-Policy",  value: csp },
        ],
      },
      {
        source:  "/tg/:path*",
        headers: [{ key: "Cache-Control", value: noStore }],
      },
      {
        source:  "/api/telegram/:path*",
        headers: [{ key: "Cache-Control", value: noStore }],
      },
      // frame-ancestors 'self' für Admin- und App-Routen:
      // Diese Bereiche dürfen NIE in einem fremden Frame eingebettet werden
      // (Clickjacking-Schutz, OWASP A05). Ausgenommen sind /tg/* — dort ist
      // Telegram-Framing gewollt und wird durch das bewusste Weglassen in der
      // globalen CSP bereits berücksichtigt.
      {
        source: "/admin/:path*",
        headers: [{
          key:   "Content-Security-Policy",
          value: [csp, "frame-ancestors 'self'"].join("; "),
        }],
      },
      {
        source: "/app/:path*",
        headers: [{
          key:   "Content-Security-Policy",
          value: [csp, "frame-ancestors 'self'"].join("; "),
        }],
      },
    ];
  },

  // Rewrites: /uploads/* → Route-Handler, der aus UPLOAD_DIR streamt
  // (Dev und Prod gleich — keine Reverse-Proxy-Konfig nötig)
  async rewrites() {
    return [
      {
        source:      "/uploads/:path*",
        destination: "/api/uploads/:path*",
      },
    ];
  },
};

/* ──────────────────────────────────────────────────────────────────────────
 * Sentry-Wrapping
 *
 * withSentryConfig() macht 2 Dinge:
 *  1. Source-Maps werden bei jedem `next build` zu Sentry hochgeladen
 *     → readable Stack-Traces im Dashboard (sonst nur minified)
 *  2. Tunnel-Route /monitoring für Ad-Blocker-Resistenz
 *     → Events gehen über deine Domain, nicht direkt zu sentry.io
 *     → werden nicht von uBlock/AdGuard etc. blockiert
 *
 * ENV (in Coolify setzen):
 *   NEXT_PUBLIC_SENTRY_DSN   (Build-Time + Client + Server)
 *   SENTRY_ORG               (Build-Time, für Source-Map-Upload)
 *   SENTRY_PROJECT           (Build-Time)
 *   SENTRY_AUTH_TOKEN        (Build-Time, Secret — Scope: project:releases)
 *
 * Wenn SENTRY_AUTH_TOKEN fehlt: Sentry läuft ohne Source-Map-Upload weiter,
 * du kriegst minified Stack-Traces.
 * ────────────────────────────────────────────────────────────────────────── */
export default withSentryConfig(nextConfig, {
  org:                  process.env.SENTRY_ORG,
  project:              process.env.SENTRY_PROJECT,
  authToken:            process.env.SENTRY_AUTH_TOKEN,
  // Source-Maps auch für Client-Side-Bundles
  widenClientFileUpload: true,
  // Tunnel-Route umgeht Ad-Blocker
  tunnelRoute:          "/monitoring",
  // Build-Output sauberhalten — nur in CI verbose loggen
  silent:               !process.env.CI,
  // Telemetrie an Sentry über Plugin-Usage selbst — kann man ausstellen
  telemetry:            false,
});
