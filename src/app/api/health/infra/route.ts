import { NextRequest, NextResponse } from "next/server";
import { redisPing } from "@/lib/redis";
import { query } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/config";

/**
 * GET /api/health/infra
 *
 * Zwei Modi:
 *
 *   1. **Public-Healthcheck** (default, Coolify nutzt das):
 *      Antwort: nur `{ ok: true/false }` + HTTP-Status 200/503
 *      Keine Provider-Namen, keine Configured-Flags — kein Recon-Leak.
 *
 *   2. **Admin-Detailed** (mit Admin-Session-Cookie):
 *      Antwort: voller Report mit Postgres + Redis + Email-Provider-Details
 *      Wird von /admin/einstellungen/system konsumiert.
 *
 * Codex-Audit LOW-1: vorher zeigte der Public-Endpoint alle Provider-
 * Konfigurations-Flags — nützliche Recon-Information für Angreifer.
 */

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const session = await requireAdminSession();
  const isAdmin = Boolean(session);

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

  // Public-Mode: nur ok + HTTP-Status (Coolify-Healthcheck-tauglich)
  if (!isAdmin) {
    return NextResponse.json(
      { ok: allOk },
      { status: allOk ? 200 : 503 },
    );
  }

  // Admin-Mode: voller Report (für /admin/einstellungen/system)
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
