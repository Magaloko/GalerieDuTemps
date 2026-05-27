import { getRedis } from "./index";

/**
 * Cache-Helper auf Redis-Basis.
 *
 * Verwendung als Wrapper um teure DB-/API-Calls:
 *   const exchange = await cached("exchange:KZT-EUR", 3600, () =>
 *     fetchWechselkurs("KZT", "EUR")
 *   );
 *
 * Key-Convention: <namespace>:<entity>:<id?> — z.B.
 *   "produkte:featured:8"          (Top-8 featured products)
 *   "kategorien:all"               (alle Kategorien)
 *   "exchange:USD-EUR"             (Wechselkurs)
 *   "marketing:home:ru"            (Marketing-Strings für Home, Locale)
 *
 * TTL in Sekunden. 0 = kein Expiry (vorsichtig nutzen — manuell invalidieren).
 *
 * Bei fehlender Redis-Verbindung degraded auf direkten Fetch ohne Cache.
 */

const NAMESPACE = "gdt:"; // Prefix für alle Keys — vermeidet Kollisionen mit anderen Apps

export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    const raw = await r.get(NAMESPACE + key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn("[cache] get failed:", err);
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    const raw = JSON.stringify(value);
    if (ttlSeconds > 0) {
      await r.set(NAMESPACE + key, raw, "EX", ttlSeconds);
    } else {
      await r.set(NAMESPACE + key, raw);
    }
  } catch (err) {
    console.warn("[cache] set failed:", err);
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  const r = getRedis();
  if (!r || keys.length === 0) return;
  try {
    await r.del(...keys.map(k => NAMESPACE + k));
  } catch (err) {
    console.warn("[cache] del failed:", err);
  }
}

/**
 * Pattern-Delete via SCAN (sicher für Production — KEYS würde blockieren).
 * Beispiel: cacheDelPattern("produkte:*") löscht alle produkte:*-Keys.
 */
export async function cacheDelPattern(pattern: string): Promise<number> {
  const r = getRedis();
  if (!r) return 0;
  try {
    const fullPattern = NAMESPACE + pattern;
    let cursor = "0";
    let deleted = 0;
    do {
      const [next, keys] = await r.scan(cursor, "MATCH", fullPattern, "COUNT", 100);
      if (keys.length > 0) {
        await r.del(...keys);
        deleted += keys.length;
      }
      cursor = next;
    } while (cursor !== "0");
    return deleted;
  } catch (err) {
    console.warn("[cache] delPattern failed:", err);
    return 0;
  }
}

/**
 * High-Level Wrapper: holt aus Cache, oder rechnet via `compute` neu + speichert.
 *
 * Pattern für teure Operationen die idempotent sind:
 *   const result = await cached("wechselkurs:USD-EUR", 3600, async () => {
 *     return await fetchWechselkurs(...);
 *   });
 */
export async function cached<T>(
  key:         string,
  ttlSeconds:  number,
  compute:     () => Promise<T>,
): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;
  const fresh = await compute();
  await cacheSet(key, fresh, ttlSeconds);
  return fresh;
}
