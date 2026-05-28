/* ──────────────────────────────────────────────────────────────────────────
 * Supabase Storage — Object-Storage-Backend für Produkt-Fotos.
 *
 * Nutzt die Storage-REST-API direkt (fetch) — KEINE zusätzliche npm-Dependency,
 * passt zum raw-pg-Ansatz des Projekts. Service-Role-Key wird NUR serverseitig
 * verwendet (niemals an den Client).
 *
 * ENV:
 *   SUPABASE_URL                — z.B. https://ovxtmihtoemqiblmccfn.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY   — Service-Role-Key (Dashboard → Settings → API)
 *   SUPABASE_STORAGE_BUCKET     — Bucket-Name (default "produktbilder")
 *
 * Bucket muss in Supabase als PUBLIC angelegt sein (Dashboard → Storage →
 * New bucket → public). Dann liefert publicUrl() direkt eine CDN-cachebare URL.
 *
 * Durability: Supabase Storage liegt auf S3-Backend (redundant). Zusammen mit
 * DB-PITR ist damit „für immer" + Backup abgedeckt.
 * ────────────────────────────────────────────────────────────────────────── */

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const BUCKET      = process.env.SUPABASE_STORAGE_BUCKET ?? "produktbilder";

/** True wenn Supabase-Storage konfiguriert ist (URL + Service-Key). */
export function supabaseStorageAktiv(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_KEY);
}

/** Öffentliche (CDN-cachebare) URL für einen Object-Key. */
export function supabasePublicUrl(objectPath: string): string {
  const clean = objectPath.replace(/^\/+/, "");
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${clean}`;
}

/**
 * Lädt einen Buffer in den Bucket. Upsert=true → idempotent (gleicher Key
 * überschreibt). Wirft bei HTTP-Fehler → Caller bricht ab BEVOR eine DB-Row
 * geschrieben wird (Atomarität: keine Waisen-Rows).
 *
 * Cache-Control: 1 Jahr immutable (Keys enthalten UUID → ändern sich nie).
 */
export async function supabaseUpload(
  objectPath:  string,
  buffer:      Buffer,
  contentType: string,
): Promise<string> {
  if (!supabaseStorageAktiv()) {
    throw new Error("Supabase Storage nicht konfiguriert (SUPABASE_URL / SERVICE_ROLE_KEY fehlt)");
  }
  const clean = objectPath.replace(/^\/+/, "");
  const url   = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${clean}`;

  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${SERVICE_KEY}`,
      "Content-Type": contentType,
      "x-upsert":     "true",
      "cache-control": "public, max-age=31536000, immutable",
    },
    // Node fetch akzeptiert Buffer/Uint8Array als Body
    body: new Uint8Array(buffer),
  });

  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    throw new Error(`Supabase upload ${r.status}: ${detail.slice(0, 300)}`);
  }
  return supabasePublicUrl(clean);
}

/**
 * Löscht ein oder mehrere Objekte aus dem Bucket (best-effort).
 * Nimmt Object-Keys ODER volle public-URLs (extrahiert dann den Key).
 */
export async function supabaseDelete(paths: string[]): Promise<void> {
  if (!supabaseStorageAktiv() || paths.length === 0) return;
  const keys = paths.map(extractObjectKey).filter(Boolean) as string[];
  if (keys.length === 0) return;

  // Storage-API: DELETE mit { prefixes: [...] } am Bucket-Endpoint
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}`;
  await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization:  `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: keys }),
  }).catch(err => console.warn("[supabaseDelete]", err));
}

/** Extrahiert den Object-Key aus einer public-URL (oder gibt den Key durch). */
export function extractObjectKey(urlOrKey: string): string | null {
  if (!urlOrKey) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = urlOrKey.indexOf(marker);
  if (idx >= 0) return urlOrKey.slice(idx + marker.length);
  // Schon ein Key (kein http) → durchreichen
  if (!urlOrKey.startsWith("http")) return urlOrKey.replace(/^\/+/, "");
  return null;
}

/** HEAD-Check ob ein Objekt existiert (für Health-Check / Orphan-GC). */
export async function supabaseExists(objectPathOrUrl: string): Promise<boolean> {
  const key = extractObjectKey(objectPathOrUrl);
  if (!key || !supabaseStorageAktiv()) return false;
  const r = await fetch(supabasePublicUrl(key), { method: "HEAD" }).catch(() => null);
  return Boolean(r && r.ok);
}
