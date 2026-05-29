/**
 * Boot-Zeit-ENV-Validierung.
 *
 * Wird in instrumentation.register() (nur nodejs-Runtime) aufgerufen und
 * verwandelt stille Fehlkonfiguration in einen schnellen, sichtbaren Fehler:
 *
 *  - FATAL: ohne diese Keys ist die App nicht funktionsfähig → harter
 *    Boot-Abbruch (besser als 500er im Live-Betrieb).
 *  - WARN: optionale/feature-spezifische Keys → nur Log-Hinweis.
 *
 * Übersprungen während `next build` (NEXT_PHASE = 'phase-production-build')
 * und im Test, weil dort echte Secrets fehlen bzw. Platzhalter injiziert werden.
 */
export function validateEnv(): void {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.NODE_ENV === "test") return;

  // ── FATAL ────────────────────────────────────────────────────────────────
  const fatal: string[] = [];
  if (!process.env.DATABASE_URL) fatal.push("DATABASE_URL");
  if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    fatal.push("AUTH_SECRET (или NEXTAUTH_SECRET)");
  }

  if (fatal.length > 0) {
    throw new Error(
      `[env] Server-Start abgebrochen — fehlende Pflicht-Variablen: ${fatal.join(", ")}. ` +
      `Bitte in Coolify (bzw. .env.local) setzen.`,
    );
  }

  // ── WARN (Features eingeschränkt, Betrieb läuft) ──────────────────────────
  const warnungen: Array<[string, boolean]> = [
    ["Site-URL (NEXT_PUBLIC_SITE_URL / NEXTAUTH_URL) — Canonical/Links/Mails",
      !process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXTAUTH_URL],
    ["E-Mail-Provider (BREVO_API_KEY / RESEND_API_KEY) — keine Transaktions-Mails",
      !process.env.BREVO_API_KEY && !process.env.RESEND_API_KEY],
    ["REDIS_URL — Cache aus, Rate-Limit fällt auf In-Memory zurück",
      !process.env.REDIS_URL],
    ["CRON_SECRET — Cron-Endpoints nicht absicherbar",
      !process.env.CRON_SECRET],
    ["Storage (SUPABASE_SERVICE_ROLE_KEY oder UPLOAD_DIR) — Bild-Uploads",
      !process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.UPLOAD_DIR],
    ["Web-Push (VAPID_PRIVATE_KEY) — Push-Benachrichtigungen aus",
      !process.env.VAPID_PRIVATE_KEY],
  ];

  const fehlend = warnungen.filter(([, missing]) => missing).map(([label]) => label);
  if (fehlend.length > 0) {
    console.warn(
      "[env] Optionale Variablen fehlen — folgende Features sind eingeschränkt:\n  - " +
      fehlend.join("\n  - "),
    );
  }
}
