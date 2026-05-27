import IORedis from "ioredis";
import type { Redis } from "ioredis";

/**
 * Redis Client (Singleton).
 *
 * Verwendet ioredis und liest die Connection-URL aus REDIS_URL.
 * Unterstützt sowohl Upstash (rediss://) als auch self-hosted (redis://).
 *
 * ENV:
 *   REDIS_URL  — z.B. rediss://default:***@***-***.upstash.io:6379
 *                oder redis://localhost:6379 für Dev
 *
 * Wenn REDIS_URL nicht gesetzt ist, returnen wir `null` und alle
 * Cache/Rate-Limit-Helper degradieren gracefully (Caching off,
 * Rate-Limit immer "allow"). So bleibt die App lauffähig ohne Redis.
 */

declare global {
  // eslint-disable-next-line no-var
  var _redisClient: Redis | undefined;
}

function createClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Redis] REDIS_URL nicht gesetzt — Cache/RateLimit/Queue degraded");
    }
    return null;
  }

  const client = new IORedis(url, {
    // Upstash hat Connect-Timeout-Quirks — wir setzen großzügige Defaults
    maxRetriesPerRequest: 3,
    enableReadyCheck:     true,
    lazyConnect:          true,
    // Auto-Reconnect mit exponential backoff
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
  });

  client.on("error", (err) => {
    // ECONNRESET bei Upstash kommt natürlich vor — nicht spammen
    if (err.message.includes("ECONNRESET")) return;
    console.error("[Redis] error:", err.message);
  });

  return client;
}

export function getRedis(): Redis | null {
  // Singleton in Dev wegen HMR
  if (globalThis._redisClient === undefined) {
    globalThis._redisClient = createClient() ?? undefined;
  }
  return globalThis._redisClient ?? null;
}

/**
 * Health-Check — gibt true zurück wenn Redis erreichbar ist.
 * Verwendet in /api/health-Endpoints.
 */
export async function redisPing(): Promise<boolean> {
  const r = getRedis();
  if (!r) return false;
  try {
    const result = await r.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}

/**
 * Verbose-Health-Check für Admin-Diagnose. Returns Status + Fehlertext.
 * Verwendet nur in /api/health/infra (Admin-only).
 */
export async function redisPingVerbose(): Promise<{
  ok:        boolean;
  pong?:     boolean;
  error?:    string;
  hostname?: string;
  tls?:      boolean;
}> {
  const url = process.env.REDIS_URL;
  if (!url) return { ok: false, error: "REDIS_URL not set" };

  // Hostname aus URL extrahieren für Diagnose
  let hostname: string | undefined;
  let tls = false;
  try {
    const u = new URL(url);
    hostname = u.hostname;
    tls      = u.protocol === "rediss:";
  } catch {
    return { ok: false, error: "REDIS_URL is malformed (cannot parse)" };
  }

  const r = getRedis();
  if (!r) return { ok: false, error: "ioredis client creation failed", hostname, tls };

  try {
    const result = await r.ping();
    return { ok: result === "PONG", pong: result === "PONG", hostname, tls };
  } catch (err) {
    return {
      ok:    false,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      hostname,
      tls,
    };
  }
}
