import type { MetadataRoute } from "next";

/* ──────────────────────────────────────────────────────────────────────────
 * Web App Manifest → macht das Web zur installierbaren PWA
 * („Zum Startbildschirm hinzufügen" / Chrome-Install-Prompt).
 *
 * Wird von Next.js unter /manifest.webmanifest ausgeliefert. Icons aus
 * public/icons/ (generiert via `npm run gen:icons`). Farben = Marken-Cobalt.
 * ────────────────────────────────────────────────────────────────────────── */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             "Galerie du Temps — винтаж с историей",
    short_name:       "Galerie",
    description:      "Кураторская коллекция винтажа. Алматы, Казахстан.",
    lang:             "ru",
    start_url:        "/?utm_source=pwa",
    scope:            "/",
    display:          "standalone",
    orientation:      "portrait-primary",
    background_color: "#1B2566",
    theme_color:      "#1B2566",
    categories:       ["shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png",     sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png",     sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Каталог",   url: "/katalog",     icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Избранное", url: "/wunschliste", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
