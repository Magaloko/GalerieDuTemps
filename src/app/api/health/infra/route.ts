import { NextResponse } from "next/server";
import { redisPing } from "@/lib/redis";
import { query } from "@/lib/db";

/**
 * GET /api/health/infra
 *
 * Diagnostic-Endpoint — testet:
 *  - Postgres-Connection (sebo.* erreichbar?)
 *  - Redis-Connection (PING)
 *  - Email-Provider-Konfiguration (welcher aktiv?)
 *
 * Nicht authentifiziert — gibt keine sensiblen Daten zurück.
 * Für Coolify-Healthchecks und Debug.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const [pg, redis] = await Promise.all([
    pgPing(),
    redisPing().catch(() => false),
  ]);

  const emailProvider = (process.env.EMAIL_PROVIDER ?? "brevo").toLowerCase();
  const emailConfigured =
    emailProvider === "resend"
      ? Boolean(process.env.RESEND_API_KEY)
      : Boolean(process.env.BREVO_API_KEY);

  const allOk = pg && (redis || !process.env.REDIS_URL);

  return NextResponse.json(
    {
      ok: allOk,
      checks: {
        postgres: pg,
        redis:    {
          configured: Boolean(process.env.REDIS_URL),
          connected:  redis,
        },
        email: {
          provider:   emailProvider,
          configured: emailConfigured,
        },
      },
    },
    { status: allOk ? 200 : 503 },
  );
}

async function pgPing(): Promise<boolean> {
  try {
    await query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
