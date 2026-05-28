import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/config";
import { migrateLocalImagesToSupabase } from "@/lib/storage/migrate-local-images";

export const dynamic     = "force-dynamic";
export const maxDuration = 120;   // viele Bilder → großzügig

/* ──────────────────────────────────────────────────────────────────────────
 * POST /api/admin/migrate-images   { dryRun?: boolean }
 *
 * Migriert lokale /uploads-Bilder → Supabase Storage. Admin-only (NextAuth-
 * Session). Ersetzt das Shell-Skript für Setups ohne Execute-Command.
 * Idempotent — beliebig oft aufrufbar.
 *
 * Body: { "dryRun": true }  → nur zählen, nichts schreiben.
 * ────────────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Нет прав" }, { status: 403 });

  let dryRun = false;
  try {
    const body = await req.json().catch(() => ({}));
    dryRun = body?.dryRun === true;
  } catch { /* kein Body → echter Lauf */ }

  try {
    const result = await migrateLocalImagesToSupabase({ dryRun });
    const status = result.ok ? 200 : 503;
    return NextResponse.json(result, { status });
  } catch (err) {
    console.error("[/api/admin/migrate-images]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Migration fehlgeschlagen" },
      { status: 500 },
    );
  }
}
