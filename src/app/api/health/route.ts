import { NextResponse } from "next/server";
import { checkDbConnection } from "@/lib/db";

// Health-Check Route – genutzt von Docker HEALTHCHECK + Caddy health_uri
// GET /api/health

export const dynamic = "force-dynamic"; // kein Caching

export async function GET() {
  const db = await checkDbConnection();

  const status = {
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

  return NextResponse.json(status, {
    status:  db.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
