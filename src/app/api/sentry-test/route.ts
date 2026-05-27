import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

/**
 * GET /api/sentry-test — wirft einen kontrollierten Error.
 *
 * Zum Verifizieren dass Sentry Server-Errors korrekt erfasst.
 * Admin-only (kein Tool für Bots).
 *
 * Nach Aufruf: in ~30s in https://sentry.io → Issues sichtbar.
 *
 * Kann später wieder entfernt werden — kein Production-Feature.
 */
export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Нет прав" }, { status: 403 });
  }

  throw new Error("[Sentry-Test] Kontrollierter Test-Error — wenn du das im Sentry-Dashboard siehst, läuft alles.");
}
