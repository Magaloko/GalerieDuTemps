/* ───────────────────────────────────────────────────────────────────────────
 * Galerie du Temps — Service Worker (PWA)  ·  v2
 *
 * WICHTIG (v2-Fix): Navigationen werden NIE gecached → die installierte PWA
 * bekommt immer das frische HTML vom Server. Das verhindert, dass ein
 * veralteter App-Shell mit alten Next.js-Server-Action-IDs ausgeliefert wird
 * (Symptom: „Login-Knopf tut nichts" nur in der installierten App).
 *
 * Strategie:
 *  - Navigationen (HTML): NETWORK-ONLY, nur bei echtem Offline → /offline.html
 *  - Content-gehashte Assets (/_next/static, /icons): cache-first (immutable)
 *  - Bilder: stale-while-revalidate
 *  - /api, /admin, /tg, /kunde, /affiliate, /login, /app: nie eingegriffen
 *
 * Version im Cache-Namen → alte Caches (inkl. v1-Seiten-Cache) werden beim
 * activate gelöscht. skipWaiting + clients.claim → neuer SW übernimmt sofort.
 * ─────────────────────────────────────────────────────────────────────────── */
const VERSION = "v2";
const STATIC_CACHE = `gdt-static-${VERSION}`;
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
      Promise.all(keys.filter((k) => ![STATIC_CACHE, IMG_CACHE].includes(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Pfade, in die der SW NIE eingreift (immer direkt ans Netz).
function isBypass(url) {
  return (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/app") ||
    url.pathname.startsWith("/tg") ||
    url.pathname.startsWith("/kunde") ||
    url.pathname.startsWith("/affiliate") ||
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/post-login")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isBypass(url)) return;

  // Navigationen → NETWORK-ONLY (nie cachen), nur Offline-Fallback.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
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
