import { AlertTriangle } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
 * EmailHealthBanner — Server-Component für Admin-Pages.
 *
 * Zeigt prominente Warnung wenn Brevo nicht konfiguriert ist. Sonst würde
 * Customer-Registration „still scheitern": User bekommt nie die
 * Bestätigungs-Mail, kann nicht aktivieren, kann nicht einloggen, fragt
 * sich was los ist — Support-Volumen explodiert.
 *
 * Wird in /admin/einstellungen und /admin/kunden eingebaut.
 * ────────────────────────────────────────────────────────────────────────── */

interface EmailHealth {
  ok:       boolean;
  problems: string[];
  env:      Record<string, string>;
}

async function getEmailHealth(): Promise<EmailHealth | null> {
  const apiKey  = process.env.BREVO_API_KEY;
  const siteUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  const problems: string[] = [];
  if (!apiKey)  problems.push("BREVO_API_KEY nicht gesetzt — Mails werden nicht versendet");
  if (!siteUrl) problems.push("NEXTAUTH_URL nicht gesetzt — Bestätigungs-Links zeigen auf localhost");
  return {
    ok:       problems.length === 0,
    problems,
    env: {
      BREVO_API_KEY: apiKey ? "✓ gesetzt" : "✗ FEHLT",
      NEXTAUTH_URL:  siteUrl ?? "✗ FEHLT",
    },
  };
}

export async function EmailHealthBanner() {
  const h = await getEmailHealth();
  if (!h || h.ok) return null;
  return (
    <div
      className="p-4 mb-6"
      style={{
        background:  "rgba(232,112,58,0.08)",
        border:      "1px solid rgba(232,112,58,0.45)",
        borderLeft:  "4px solid var(--color-coral)",
      }}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--color-coral)" }} />
        <div className="flex-1 min-w-0 text-sm">
          <p style={{ color: "var(--color-ink)", fontWeight: 500 }}>
            ⚠ E-Mail-Setup unvollständig — Customer-Registrierung scheitert still
          </p>
          <ul className="mt-1.5 space-y-1 list-disc pl-5" style={{ color: "var(--color-ink-soft)" }}>
            {h.problems.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
          <p className="mt-2 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
            <b>Fix in Coolify ENV:</b>{" "}
            <code style={{
              background: "#fff", padding: "1px 6px",
              border: "1px solid var(--color-line)",
              fontFamily: "var(--font-mono)", fontSize: 12,
            }}>BREVO_API_KEY</code>,{" "}
            <code style={{
              background: "#fff", padding: "1px 6px",
              border: "1px solid var(--color-line)",
              fontFamily: "var(--font-mono)", fontSize: 12,
            }}>BREVO_SENDER_EMAIL</code>,{" "}
            <code style={{
              background: "#fff", padding: "1px 6px",
              border: "1px solid var(--color-line)",
              fontFamily: "var(--font-mono)", fontSize: 12,
            }}>NEXTAUTH_URL</code>{" "}
            setzen, dann Redeploy. Status-Check: <code style={{
              background: "#fff", padding: "1px 6px",
              border: "1px solid var(--color-line)",
              fontFamily: "var(--font-mono)", fontSize: 12,
            }}>/api/health/email</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
