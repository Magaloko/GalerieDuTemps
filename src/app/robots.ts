import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXTAUTH_URL ?? "https://galeriedutemps.kz";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow:     ["/", "/katalog", "/kategorien", "/about", "/kontakt"],
        disallow:  [
          "/admin",       // Admin-Bereich
          "/admin/*",
          "/api/*",       // alle API-Routen
          "/login",
          "/wunschliste", // session-spezifisch
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host:    BASE_URL,
  };
}
