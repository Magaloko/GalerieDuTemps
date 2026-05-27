import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /api/health/email
 *
 * Diagnose-Endpoint für E-Mail-Setup (Brevo). Ohne diesen Setup-Check würde
 * Customer-Registration „still scheitern" — User registriert sich, sieht
 * Success-Screen, bekommt aber NIE die Bestätigungs-Mail.
 *
 * Prüft: BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME, NEXTAUTH_URL
 * (letzteres weil die Confirm-Link-URL daraus gebaut wird).
 *
 * KEIN echter Send-Test (würde Brevo-Mailing-Quota verbrauchen) — nur env-
 * Variablen-Check + optional Brevo /v3/account API-Call.
 * ────────────────────────────────────────────────────────────────────────── */

export async function GET() {
  const apiKey       = process.env.BREVO_API_KEY;
  const senderEmail  = process.env.BREVO_SENDER_EMAIL ?? "noreply@galeriedutemps.kz (default)";
  const senderName   = process.env.BREVO_SENDER_NAME  ?? "Galerie du Temps (default)";
  const siteUrl      = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL;

  const problems: string[] = [];
  if (!apiKey)  problems.push("BREVO_API_KEY не задан — письма не отправляются!");
  if (!siteUrl) problems.push("NEXTAUTH_URL не задан — ссылки в письмах будут на localhost!");

  // Optional: Brevo-Account-Ping wenn Key gesetzt
  let brevoAccount: { ok: boolean; email?: string; plan?: string; error?: string } | undefined;
  if (apiKey) {
    try {
      const r = await fetch("https://api.brevo.com/v3/account", {
        headers: { "api-key": apiKey, accept: "application/json" },
        // Kein Cache, kein Sleep — schneller Round-trip
        cache: "no-store",
      });
      if (r.ok) {
        const data = await r.json() as { email?: string; plan?: Array<{ type?: string }> };
        brevoAccount = { ok: true, email: data.email, plan: data.plan?.[0]?.type };
      } else {
        const err = await r.text();
        brevoAccount = { ok: false, error: `Brevo API ${r.status}: ${err.slice(0, 100)}` };
        problems.push(`BREVO_API_KEY ist gesetzt aber ungültig (Brevo ${r.status})`);
      }
    } catch (err) {
      brevoAccount = { ok: false, error: err instanceof Error ? err.message : String(err) };
      problems.push("Brevo-API nicht erreichbar (Netzwerk-Problem?)");
    }
  }

  const ok = problems.length === 0;

  return NextResponse.json({
    ok,
    env: {
      BREVO_API_KEY:      apiKey ? `set (${apiKey.slice(0, 8)}…)` : "NICHT GESETZT",
      BREVO_SENDER_EMAIL: senderEmail,
      BREVO_SENDER_NAME:  senderName,
      NEXTAUTH_URL:       siteUrl ?? "NICHT GESETZT",
    },
    brevoAccount,
    problems,
    hinweis: ok
      ? "E-Mail-Setup OK — Customer-Registration kann Bestätigungs-Mails senden."
      : "E-Mail-Setup unvollständig. Setze die fehlenden ENV-Variablen in Coolify und redeploye.",
  }, {
    status:  ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
