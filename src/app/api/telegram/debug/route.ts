import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSiteUrl } from "@/lib/site-url";
import { requireAdminSession } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * GET /api/telegram/debug — Health-Check für Mini-App-Auth-Setup.
 *
 * Zeigt OHNE Tokens preiszugeben:
 *  - Bot in DB konfiguriert (ja/nein)
 *  - Webhook-URL gespeichert (ja/nein)
 *  - telegram-Spalten in customers vorhanden (ja/nein) — Migration 026 check
 *  - carts-Tabelle vorhanden (ja/nein) — Migration 034 check
 *  - Site-URL die getSiteUrl() zurückgibt
 *
 * Public-Endpoint (kein Auth). Gibt KEINE Tokens / IDs / sensitive Daten.
 * ────────────────────────────────────────────────────────────────────────── */
export async function GET() {
  // Admin-Gate: dieser Endpoint verrät Infrastruktur-Details (Bot-Username,
  // gesetzte Secrets, Migrationsstatus) → nur für eingeloggte Admins.
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const result: Record<string, unknown> = {
    site_url: getSiteUrl(),
    timestamp: new Date().toISOString(),
  };

  // 1. Bot in DB?
  try {
    const r = await query<{ count: number; has_token: boolean; username: string | null }>(
      `SELECT
         COUNT(*)::int AS count,
         BOOL_OR(access_token IS NOT NULL AND length(access_token) > 20) AS has_token,
         MAX(username) AS username
       FROM sebo.kanal_konten
       WHERE kanal = 'telegram' AND aktiv = true`
    );
    result.bot = {
      configured: r.rows[0]?.count > 0,
      has_token:  r.rows[0]?.has_token ?? false,
      username:   r.rows[0]?.username,
    };
  } catch (err) {
    result.bot = { error: errMsg(err) };
  }

  // 2. customers.telegram_chat_id existiert? (Migration 026)
  try {
    const r = await query<{ has: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'sebo' AND table_name = 'customers'
          AND column_name = 'telegram_chat_id'
      ) AS has`
    );
    result.migration_026_customer_telegram = r.rows[0]?.has ?? false;
  } catch (err) {
    result.migration_026_customer_telegram = { error: errMsg(err) };
  }

  // 3. carts-Tabelle existiert? (Migration 034)
  try {
    const r = await query<{ has: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'sebo' AND table_name = 'carts'
      ) AS has`
    );
    result.migration_034_carts = r.rows[0]?.has ?? false;
  } catch (err) {
    result.migration_034_carts = { error: errMsg(err) };
  }

  // 4. DB-Verbindung allgemein
  try {
    const r = await query<{ now: string }>(`SELECT now() AS now`);
    result.db = { ok: true, server_time: r.rows[0]?.now };
  } catch (err) {
    result.db = { ok: false, error: errMsg(err) };
  }

  // 5. Auth-Secrets vorhanden? (für webapp-session-cookie)
  result.env = {
    has_auth_secret:     !!process.env.AUTH_SECRET,
    has_nextauth_secret: !!process.env.NEXTAUTH_SECRET,
    has_site_url:        !!process.env.NEXT_PUBLIC_SITE_URL,
    has_nextauth_url:    !!process.env.NEXTAUTH_URL,
    node_env:            process.env.NODE_ENV,
  };

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
