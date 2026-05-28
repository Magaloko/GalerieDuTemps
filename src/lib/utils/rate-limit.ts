/**
 * Rate-Limiter — Redis-backed mit In-Memory-Fallback.
 *
 * Verwendet Redis wenn REDIS_URL gesetzt ist (mehrere Replicas teilen sich
 * den Bucket), sonst In-Memory (single-instance OK, aber bei mehreren
 * Containern/Replicas verteilt sich das Limit pro Container).
 *
 * Public-API bleibt rückwärtskompatibel — bestehende Callers funktionieren
 * unverändert.
 *
 * - `rateLimitPruefen(key, limit, fensterMs)` — sync, In-Memory only
 * - `rateLimitAsync(key, limit, fensterMs)` — async, Redis-backed
 *
 * Empfehlung: für neue Endpoints `rateLimitAsync` nutzen.
 */

import { NextResponse } from "next/server";
import { rateLimit as redisRateLimit } from "@/lib/redis/rate-limit";

// ─── In-Memory-Fallback ────────────────────────────────────────────────────
interface Bucket {
  zaehler:        number;
  zuruecksetzen:  number;
}

const buckets = new Map<string, Bucket>();

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const jetzt = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.zuruecksetzen < jetzt) buckets.delete(key);
    }
  }, 5 * 60 * 1000).unref?.();
}

// ─── Public Types ──────────────────────────────────────────────────────────
export interface RateLimitErgebnis {
  erlaubt:     boolean;
  verbleibend: number;
  reset:       number;   // Unix-Timestamp (ms)
  limit:       number;
}

// ─── Sync (In-Memory only) ─────────────────────────────────────────────────
/**
 * Synchroner Rate-Limiter (In-Memory). Beibehalten für Backwards-Compat.
 * Für neuere Endpoints `rateLimitAsync` verwenden — der nutzt Redis falls
 * verfügbar und funktioniert auch über mehrere Container.
 */
export function rateLimitPruefen(
  schluessel: string,
  limit:      number,
  fensterMs:  number,
): RateLimitErgebnis {
  const jetzt = Date.now();
  let bucket  = buckets.get(schluessel);

  if (!bucket || bucket.zuruecksetzen < jetzt) {
    bucket = { zaehler: 0, zuruecksetzen: jetzt + fensterMs };
    buckets.set(schluessel, bucket);
  }
  bucket.zaehler++;

  return {
    erlaubt:     bucket.zaehler <= limit,
    verbleibend: Math.max(0, limit - bucket.zaehler),
    reset:       bucket.zuruecksetzen,
    limit,
  };
}

// ─── Async (Redis-backed) ──────────────────────────────────────────────────
/**
 * Async Rate-Limiter — nutzt Redis (mit Pipeline-Atomicity). Bei fehlender
 * Redis-Verbindung degraded auf In-Memory-Bucket (rateLimitPruefen).
 *
 * Beispiel:
 *   const rl = await rateLimitAsync(`kontakt:${ip}`, 5, 60_000);
 *   if (!rl.erlaubt) return tooManyRequestsResponse(rl);
 */
export async function rateLimitAsync(
  schluessel: string,
  limit:      number,
  fensterMs:  number,
): Promise<RateLimitErgebnis> {
  if (process.env.REDIS_URL) {
    const r = await redisRateLimit(schluessel, {
      max:       limit,
      windowSec: Math.ceil(fensterMs / 1000),
    });
    return {
      erlaubt:     r.success,
      verbleibend: r.remaining,
      reset:       r.reset * 1000, // → ms
      limit:       r.limit,
    };
  }
  // Kein Redis → In-Memory
  return rateLimitPruefen(schluessel, limit, fensterMs);
}

// ─── Helpers ───────────────────────────────────────────────────────────────
/** Extrahiert die Client-IP aus Headers (Caddy/Reverse-Proxy-aware) */
export function getClientIp(req: Request): string {
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return "unknown";
}

/** HTTP 429 Response-Helper — gibt NextResponse zurück, kein cast nötig.
 *  Optional `message`-Override für lokalisierte/kontextspezifische Texte
 *  (sonst Default-Russian, weil Hauptpublikum RU-sprachig ist). */
export function tooManyRequestsResponse(
  info: RateLimitErgebnis,
  message?: string,
): NextResponse {
  const retryAfterSekunden = Math.ceil((info.reset - Date.now()) / 1000);
  const min = Math.ceil(retryAfterSekunden / 60);
  const defaultMsg = retryAfterSekunden < 60
    ? `Слишком много запросов. Попробуйте через ${retryAfterSekunden} сек.`
    : `Слишком много запросов. Попробуйте через ${min} мин.`;
  return NextResponse.json(
    {
      error:        message ?? defaultMsg,
      retry_after:  retryAfterSekunden,
      rate_limited: true,
    },
    {
      status:  429,
      headers: {
        "Retry-After":           String(retryAfterSekunden),
        "X-RateLimit-Limit":     String(info.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset":     String(info.reset),
      },
    },
  );
}
