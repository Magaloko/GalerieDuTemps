import { getRedis } from "./index";

/**
 * Token-Bucket Rate-Limiter via Redis INCR + EXPIRE.
 *
 * Algorithmus: simpler Fixed-Window-Counter (kein Lua-Script nötig).
 * Pro Key wird ein Zähler hochgezählt — beim ersten Zugriff der Periode
 * wird EXPIRE gesetzt. Nach Ablauf der Periode startet das Fenster neu.
 *
 * Bei fehlendem Redis: degraded auf "always allow" (Production-Setup
 * muss Redis haben, in Dev nicht zwingend).
 *
 * Verwendung:
 *   const rl = await rateLimit(`ai-chat:${ip}`, { max: 10, windowSec: 60 });
 *   if (!rl.success) return new Response("Too many requests", { status: 429 });
 */

export interface RateLimitResult {
  success:    boolean;  // true wenn unter dem Limit
  remaining:  number;   // wie viele Requests noch erlaubt im Fenster
  reset:      number;   // Unix-Timestamp wenn das Fenster reset
  limit:      number;   // konfiguriertes Maximum
}

export interface RateLimitOptions {
  max:        number;   // max Requests pro Fenster
  windowSec:  number;   // Fenster-Größe in Sekunden
}

const KEY_PREFIX = "gdt:ratelimit:";

export async function rateLimit(
  identifier: string,
  opts:       RateLimitOptions,
): Promise<RateLimitResult> {
  const r = getRedis();

  // No Redis → kein Rate-Limiting möglich. In Production sollte das nicht
  // passieren, aber wir wollen die App nicht killen falls Redis-Outage.
  if (!r) {
    return {
      success:   true,
      remaining: opts.max,
      reset:     Math.floor(Date.now() / 1000) + opts.windowSec,
      limit:     opts.max,
    };
  }

  const key = KEY_PREFIX + identifier;

  try {
    // Atomic: INCR + EXPIRE (nur wenn key neu). Pipeline für 1 Round-Trip.
    const pipe = r.pipeline();
    pipe.incr(key);
    pipe.ttl(key);
    const results = await pipe.exec();
    if (!results) throw new Error("pipeline returned null");

    const count = results[0][1] as number;
    let   ttl   = results[1][1] as number;

    // Beim ersten Hit ist TTL = -1 → EXPIRE setzen
    if (ttl === -1) {
      await r.expire(key, opts.windowSec);
      ttl = opts.windowSec;
    }

    const success   = count <= opts.max;
    const remaining = Math.max(0, opts.max - count);
    const reset     = Math.floor(Date.now() / 1000) + (ttl > 0 ? ttl : opts.windowSec);

    return { success, remaining, reset, limit: opts.max };
  } catch (err) {
    console.warn("[rate-limit] error — allow:", err);
    return {
      success:   true,
      remaining: opts.max,
      reset:     Math.floor(Date.now() / 1000) + opts.windowSec,
      limit:     opts.max,
    };
  }
}

/**
 * Helper: extrahiert IP aus Next.js Request für Rate-Limit-Identifier.
 * Funktioniert hinter Caddy/Coolify (x-forwarded-for) und Vercel.
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    // x-forwarded-for kann eine Liste sein: "real-ip, proxy1, proxy2" — wir wollen real-ip
    return xff.split(",")[0]!.trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
