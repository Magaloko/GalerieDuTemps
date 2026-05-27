import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

/**
 * GET /api/health/email
 *
 * Diagnose-Endpoint für E-Mail-Setup — provider-aware.
 * Prüft: EMAIL_PROVIDER + API-Key des aktiven Providers + NEXTAUTH_URL.
 *
 * Bei EMAIL_PROVIDER=resend: prüft RESEND_API_KEY + EMAIL_FROM
 * Bei EMAIL_PROVIDER=brevo (default): prüft BREVO_API_KEY + optionaler Ping
 */
export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Нет прав" }, { status: 403 });
  }

  const provider  = (process.env.EMAIL_PROVIDER ?? "brevo").toLowerCase();
  const siteUrl   = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  const emailFrom = process.env.EMAIL_FROM;

  const problems: string[] = [];
  if (!siteUrl) problems.push("NEXTAUTH_URL nicht gesetzt — Links in Mails zeigen auf localhost!");

  let providerDetails: Record<string, unknown> = {};

  if (provider === "resend") {
    // ── Resend ──────────────────────────────────────────────────────────────
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      problems.push("RESEND_API_KEY nicht gesetzt — Mails werden NICHT gesendet!");
    } else if (!apiKey.startsWith("re_")) {
      problems.push("RESEND_API_KEY sieht ungültig aus (muss mit re_ beginnen)");
    }
    if (!emailFrom) {
      problems.push("EMAIL_FROM nicht gesetzt — Resend braucht eine verifizierte Absender-Adresse");
    }

    providerDetails = {
      RESEND_API_KEY: apiKey
        ? `gesetzt (${apiKey.slice(0, 8)}…)`
        : "NICHT GESETZT",
      EMAIL_FROM:     emailFrom ?? "NICHT GESETZT",
      EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME ?? "(nicht gesetzt, default wird genutzt)",
    };

  } else {
    // ── Brevo (default / Fallback) ───────────────────────────────────────────
    const apiKey      = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL ?? "noreply@galeriedutemps.kz (default)";
    const senderName  = process.env.BREVO_SENDER_NAME  ?? "Galerie du Temps (default)";

    if (!apiKey) {
      problems.push("BREVO_API_KEY nicht gesetzt — Mails werden NICHT gesendet!");
    }

    // Optional: Brevo-Account-Ping wenn Key gesetzt
    let brevoAccount: { ok: boolean; email?: string; plan?: string; error?: string } | undefined;
    if (apiKey) {
      try {
        const r = await fetch("https://api.brevo.com/v3/account", {
          headers: { "api-key": apiKey, accept: "application/json" },
          cache: "no-store",
        });
        if (r.ok) {
          const data = await r.json() as { email?: string; plan?: Array<{ type?: string }> };
          brevoAccount = { ok: true, email: data.email, plan: data.plan?.[0]?.type };
        } else {
          const err = await r.text();
          brevoAccount = { ok: false, error: `Brevo API ${r.status}: ${err.slice(0, 100)}` };
          problems.push(`BREVO_API_KEY gesetzt aber ungültig (Brevo ${r.status})`);
        }
      } catch (err) {
        brevoAccount = { ok: false, error: err instanceof Error ? err.message : String(err) };
        problems.push("Brevo-API nicht erreichbar (Netzwerk-Problem?)");
      }
    }

    providerDetails = {
      BREVO_API_KEY:      apiKey ? `gesetzt (${apiKey.slice(0, 8)}…)` : "NICHT GESETZT",
      BREVO_SENDER_EMAIL: senderEmail,
      BREVO_SENDER_NAME:  senderName,
      brevoAccount,
    };
  }

  const ok = problems.length === 0;

  return NextResponse.json(
    {
      ok,
      provider,
      env: {
        EMAIL_PROVIDER: provider,
        NEXTAUTH_URL:   siteUrl ?? "NICHT GESETZT",
        ...providerDetails,
      },
      problems,
      hinweis: ok
        ? `E-Mail-Setup OK — Provider: ${provider}`
        : "E-Mail-Setup unvollständig. Setze die fehlenden ENV-Variablen in Coolify und redeploye.",
    },
    {
      status:  ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
