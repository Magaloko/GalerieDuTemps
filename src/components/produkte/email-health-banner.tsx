import { AlertTriangle } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
 * EmailHealthBanner — Server-Component für Admin-Pages.
 *
 * Zeigt prominente Warnung wenn der konfigurierte E-Mail-Provider (Resend
 * oder Brevo) nicht vollständig eingerichtet ist. Sonst würde Customer-
 * Registration „still scheitern": User bekommt nie die Bestätigungs-Mail,
 * kann nicht aktivieren, kann nicht einloggen, fragt sich was los ist
 * — Support-Volumen explodiert.
 *
 * Wird in /admin/einstellungen und /admin/kunden eingebaut.
 * ────────────────────────────────────────────────────────────────────────── */

interface EmailHealth {
  ok:        boolean;
  provider:  string;
  problems:  string[];
  env:       Record<string, string>;
}

async function getEmailHealth(): Promise<EmailHealth | null> {
  const provider  = (process.env.EMAIL_PROVIDER ?? "brevo").toLowerCase();
  const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL;
  const emailFrom = process.env.EMAIL_FROM;
  const problems: string[] = [];

  // Provider-spezifischer Key-Check
  if (provider === "resend") {
    const key = process.env.RESEND_API_KEY;
    if (!key)                       problems.push("RESEND_API_KEY nicht gesetzt — Mails werden NICHT versendet");
    else if (!key.startsWith("re_")) problems.push("RESEND_API_KEY sieht ungültig aus (muss mit re_ beginnen)");
    if (!emailFrom)                  problems.push("EMAIL_FROM nicht gesetzt — Resend braucht verifizierte Absender-Adresse");
  } else {
    if (!process.env.BREVO_API_KEY) problems.push("BREVO_API_KEY nicht gesetzt — Mails werden NICHT versendet");
  }

  if (!siteUrl) {
    problems.push("NEXT_PUBLIC_SITE_URL / NEXTAUTH_URL nicht gesetzt — Bestätigungs-Links zeigen auf localhost");
  }

  return {
    ok:       problems.length === 0,
    provider,
    problems,
    env: {
      EMAIL_PROVIDER: provider,
      [`${provider.toUpperCase()}_API_KEY`]:
        provider === "resend"
          ? (process.env.RESEND_API_KEY ? "✓ gesetzt" : "✗ FEHLT")
          : (process.env.BREVO_API_KEY  ? "✓ gesetzt" : "✗ FEHLT"),
      EMAIL_FROM:        emailFrom    ?? "(default)",
      NEXT_PUBLIC_SITE_URL: siteUrl   ?? "✗ FEHLT",
    },
  };
}

export async function EmailHealthBanner() {
  const h = await getEmailHealth();
  if (!h || h.ok) return null;

  // Provider-spezifische Setup-Hilfe
  const envHinweise =
    h.provider === "resend"
      ? ["RESEND_API_KEY", "EMAIL_FROM", "NEXT_PUBLIC_SITE_URL"]
      : ["BREVO_API_KEY", "BREVO_SENDER_EMAIL", "NEXT_PUBLIC_SITE_URL"];

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
            ⚠ E-Mail-Setup unvollständig
            {" — "}Provider: <code style={inlineCode}>{h.provider}</code>
            {" — "}Customer-Registrierung scheitert still
          </p>
          <ul className="mt-1.5 space-y-1 list-disc pl-5" style={{ color: "var(--color-ink-soft)" }}>
            {h.problems.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
          <p className="mt-2 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
            <b>Fix in Coolify ENV:</b>{" "}
            {envHinweise.map((k, i) => (
              <span key={k}>
                <code style={inlineCode}>{k}</code>
                {i < envHinweise.length - 1 ? ", " : ""}
              </span>
            ))}
            {" "}setzen, dann Redeploy. Live-Status:{" "}
            <code style={inlineCode}>/admin/einstellungen/system</code>.
          </p>
        </div>
      </div>
    </div>
  );
}

const inlineCode: React.CSSProperties = {
  background:  "#fff",
  padding:     "1px 6px",
  border:      "1px solid var(--color-line)",
  fontFamily:  "var(--font-mono)",
  fontSize:    12,
};
