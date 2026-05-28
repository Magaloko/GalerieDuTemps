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
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key:   "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
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
