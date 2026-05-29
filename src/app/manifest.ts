import type { MetadataRoute } from "next";

/* ──────────────────────────────────────────────────────────────────────────
 * Web App Manifest → macht das Web zur installierbaren PWA
 * („Zum Startbildschirm hinzufügen" / Chrome-Install-Prompt).
 *
 * Wird von Next.js unter /manifest.webmanifest ausgeliefert. Icons aus
 * public/icons/ (generiert via `npm run gen:icons`). Farben = Marken-Cobalt.
 *
 * HAUPTVERSION = Operator-App: start_url zeigt auf /app (Kachel-Menü). Die
 * installierte App öffnet also direkt die Verwaltung. scope bleibt "/", damit
 * von dort aus Shop-/Admin-Seiten erreichbar sind. (Bei gültiger Admin-Session
 * → Kacheln; sonst → Login.)
 * ────────────────────────────────────────────────────────────────────────── */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             "Galerie du Temps",
    short_name:       "Galerie",
    description:      "Управление галереей: заказы, клиенты, каталог. Алматы, Казахстан.",
    lang:             "ru",
    start_url:        "/app",
    scope:            "/",
    display:          "standalone",
    orientation:      "portrait-primary",
    background_color: "#1B2566",
    theme_color:      "#1B2566",
    categories:       ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png",     sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png",     sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Меню",   url: "/app/menu",          icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Заказы", url: "/admin/bestellungen", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Каталог",url: "/katalog",            icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
