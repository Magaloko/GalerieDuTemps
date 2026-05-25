/**
 * Einfacher In-Memory Rate-Limiter (Token-Bucket)
 *
 * Für mehrere Server-Instanzen sollte Redis o.ä. verwendet werden.
 * Hier reicht In-Memory, da das vintage-market auf einer VPS-Instanz läuft.
 */

interface Bucket {
  zaehler:    number;
  zuruecksetzen: number;
}

const buckets = new Map<string, Bucket>();

// Cleanup-Interval (alle 5 Minuten alte Einträge entfernen)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const jetzt = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.zuruecksetzen < jetzt) buckets.delete(key);
    }
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitErgebnis {
  erlaubt:    boolean;
  verbleibend: number;
  reset:      number;        // Unix-Timestamp (ms)
  limit:      number;
}

/**
 * Prüft, ob ein Request unter dem Limit liegt und erhöht den Zähler.
 *
 * @param schluessel  Eindeutiger Schlüssel (z.B. IP + Endpoint)
 * @param limit       Max. Requests im Fenster
 * @param fensterMs   Zeitfenster in Millisekunden
 */
export function rateLimitPruefen(
  schluessel: string,
  limit:      number,
  fensterMs:  number
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

/** Extrahiert die Client-IP aus Headers (Caddy/Reverse-Proxy-aware) */
export function getClientIp(req: Request): string {
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

/** HTTP 429 Response-Helper */
export function tooManyRequestsResponse(info: RateLimitErgebnis): Response {
  const retryAfterSekunden = Math.ceil((info.reset - Date.now()) / 1000);
  return new Response(
    JSON.stringify({
      error: `Zu viele Anfragen. Bitte in ${retryAfterSekunden}s erneut versuchen.`,
    }),
    {
      status:  429,
      headers: {
        "Content-Type":          "application/json",
        "Retry-After":           String(retryAfterSekunden),
        "X-RateLimit-Limit":     String(info.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset":     String(info.reset),
      },
    }
  );
}
