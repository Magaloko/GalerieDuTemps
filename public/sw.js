/* ───────────────────────────────────────────────────────────────────────────
 * Galerie du Temps — Service Worker (PWA)
 *
 * Konservative Strategie, damit nichts „stale" wird:
 *  - Navigationen (HTML): network-first → bei Offline Cache, sonst /offline.html
 *  - Statische, content-gehashte Assets (/_next/static, /icons): cache-first
 *  - Bilder: stale-while-revalidate
 *  - NIE gecached: /api, /admin, /tg, Auth — immer Netzwerk (frisch + sicher)
 *
 * Version im Cache-Namen → alter Cache wird bei Update gelöscht (activate).
 * ─────────────────────────────────────────────────────────────────────────── */
const VERSION = "v1";
const STATIC_CACHE = `gdt-static-${VERSION}`;
const PAGE_CACHE   = `gdt-pages-${VERSION}`;
const IMG_CACHE    = `gdt-img-${VERSION}`;
const OFFLINE_URL  = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => ![STATIC_CACHE, PAGE_CACHE, IMG_CACHE].includes(k)).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Pfade, die NIE über den SW laufen (immer direkt ans Netz).
function isBypass(url) {
  return (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/tg") ||
    url.pathname.startsWith("/kunde") ||
    url.pathname.startsWith("/affiliate")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // keine Cross-Origin-Eingriffe
  if (isBypass(url)) return;                        // Admin/API/Mini-App: Netzwerk pur

  // Navigationen → network-first mit Offline-Fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGE_CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Content-gehashte Build-Assets → cache-first (immutable).
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then((hit) =>
        hit ||
        fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
      )
    );
    return;
  }

  // Bilder → stale-while-revalidate.
  if (request.destination === "image" || url.pathname.startsWith("/_next/image")) {
    event.respondWith(
      caches.match(request).then((hit) => {
        const net = fetch(request)
          .then((res) => {
            const copy = res.clone();
            caches.open(IMG_CACHE).then((c) => c.put(request, copy)).catch(() => {});
            return res;
          })
          .catch(() => hit);
        return hit || net;
      })
    );
  }
});
