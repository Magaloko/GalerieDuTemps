import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

/* ──────────────────────────────────────────────────────────────────────────
 * cronGuard — Timing-sicherer Vergleich des x-cron-secret-Headers.
 *
 * Gibt null zurück wenn das Secret korrekt ist.
 * Gibt eine fertige 401-Response zurück wenn das Secret fehlt oder falsch ist.
 *
 * Verwendung in Cron-Routes:
 *   const unauth = cronGuard(req);
 *   if (unauth) return unauth;
 *
 * Timing-Angriff-Schutz: timingSafeEqual stellt sicher, dass die Prüfung
 * nicht durch Laufzeitunterschiede (Early-Exit bei Mismatch) ausgenutzt
 * werden kann (Timing Side-Channel, OWASP A07).
 * ────────────────────────────────────────────────────────────────────────── */
export function cronGuard(req: NextRequest): NextResponse | null {
  const expected = process.env.CRON_SECRET;
  const secret   = req.headers.get("x-cron-secret") ?? "";

  const a = Buffer.from(secret,    "utf8");
  const b = Buffer.from(expected ?? "", "utf8");

  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
