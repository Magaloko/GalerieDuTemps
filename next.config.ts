import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone-Output für Docker (minimales Production-Image)
  output: "standalone",

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
