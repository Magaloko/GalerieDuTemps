import type { NextConfig } from "next";

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
        hostname:  "galeriedutemps.kz",
        pathname:  "/uploads/**",
      },
      {
        protocol: "https",
        hostname:  "*.apps.dadakaev.tech",
        pathname:  "/uploads/**",
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

export default nextConfig;
