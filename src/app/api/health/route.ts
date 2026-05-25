import { NextResponse } from "next/server";
import { checkDbConnection } from "@/lib/db";

/**
 * Health-Check — genutzt von Docker HEALTHCHECK + Reverse-Proxies (Caddy/Coolify).
 *
 * Liefert IMMER 200, solange der Node-Prozess läuft.
 * DB-Status steht im JSON-Body — Container darf NICHT als "unhealthy"
 * markiert werden, nur weil die DB temporär down ist (sonst Rollback-Loop).
 *
 * Nutze `services.database.ok` für echtes Monitoring (Uptime-Tracker, etc.).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const db = await checkDbConnection().catch(err => ({
    ok: false,
    latencyMs: 0,
    error: String(err?.message ?? err),
  }));

  const body = {
    status:    db.ok ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    version:   process.env.npm_package_version ?? "unknown",
    uptime:    Math.floor(process.uptime()),
    services:  {
      database: {
        ok:        db.ok,
        latencyMs: db.latencyMs,
        ...(db.error ? { error: db.error } : {}),
      },
    },
  };

  // 200 auch bei degraded — Container bleibt healthy, Monitoring sieht's via JSON
  return NextResponse.json(body, {
    status:  200,
    headers: { "Cache-Control": "no-store" },
  });
}
