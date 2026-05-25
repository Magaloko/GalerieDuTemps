import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { sendEmail, kontaktBestaetigung } from "@/lib/email/brevo";
import { rateLimitPruefen, getClientIp, tooManyRequestsResponse } from "@/lib/utils/rate-limit";
import { getAffiliateCookie, clearAffiliateCookie, hashWithSalt } from "@/lib/affiliate/cookie";
import { affiliateByReferralCode } from "@/lib/db/affiliates";
import { attributionAnlegen } from "@/lib/db/affiliate-tracking";
import { z } from "zod";

export const dynamic = "force-dynamic";

const KontaktSchema = z.object({
  name:       z.string().min(2).max(100),
  email:      z.string().email(),
  betreff:    z.string().max(200).optional(),
  nachricht:  z.string().min(10).max(5000),
  produkt_id: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  // Rate-Limit: 3 Kontakt-Anfragen / 10 Minuten / IP
  const clientIp = getClientIp(req);
  const rl = rateLimitPruefen(`kontakt:${clientIp}`, 3, 10 * 60 * 1000);
  if (!rl.erlaubt) return tooManyRequestsResponse(rl) as unknown as NextResponse;

  try {
    const body   = await req.json();
    const parsed = KontaktSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ungültige Eingabe", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { name, email, betreff, nachricht, produkt_id } = parsed.data;
    const ipForDb = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for") ?? null;

    // 1. Kontaktanfrage in DB speichern
    const kontaktRes = await query<{ id: string }>(
      `INSERT INTO sebo.kontaktanfragen (name, email, betreff, nachricht, produkt_id, ip_adresse)
       VALUES ($1, $2, $3, $4, $5, $6::inet)
       RETURNING id`,
      [name, email, betreff ?? null, nachricht, produkt_id ?? null, ipForDb]
    );
    const kontaktId = kontaktRes.rows[0].id;

    // 2. Affiliate-Attribution: Cookie lesen, Self-Purchase prüfen, attribuieren
    const cookie = await getAffiliateCookie();
    if (cookie?.code) {
      const affiliate = await affiliateByReferralCode(cookie.code).catch(() => null);

      if (affiliate) {
        // Self-Purchase-Check: gleiche E-Mail → keine Attribution
        const istSelf = affiliate.email.toLowerCase() === email.toLowerCase();

        if (!istSelf) {
          // IP+UA-Hash für Fraud-Erkennung
          const userAgent = req.headers.get("user-agent") ?? "";
          const ipHash    = clientIp !== "unknown" ? hashWithSalt(clientIp) : null;
          const uaHash    = userAgent              ? hashWithSalt(userAgent) : null;

          // Verdächtigkeits-Flag: wenn IP-Hash nicht zum gespeicherten Klick passt
          // (z.B. Cookie wurde manuell von anderer IP gesetzt)
          let flagVerdaechtig = false;
          if (cookie.klick_id) {
            const klickRes = await query<{ ip_hash: string | null }>(
              `SELECT ip_hash FROM sebo.affiliate_klicks WHERE id = $1`,
              [cookie.klick_id]
            ).catch(() => null);
            const klickIp = klickRes?.rows[0]?.ip_hash ?? null;
            flagVerdaechtig = !!(klickIp && ipHash && klickIp !== ipHash);
          }

          await attributionAnlegen({
            kontaktanfrage_id:      kontaktId,
            affiliate_id:           affiliate.id,
            referral_code_snapshot: cookie.code,
            klick_id:               cookie.klick_id,
            ip_hash:                ipHash,
            ua_hash:                uaHash,
            flag_verdaechtig:       flagVerdaechtig,
          });
        }
      }
    }

    // 3. Bestätigungs-E-Mail an Kunden
    await sendEmail({
      to:          [{ email, name }],
      subject:     "Ihre Nachricht bei Galerie du Temps",
      htmlContent: kontaktBestaetigung(name, nachricht),
      tags:        ["kontakt"],
    }).catch(err => console.error("[Kontakt] Brevo-Fehler:", err));

    // 4. Admin-Benachrichtigung via N8N Webhook (non-blocking)
    const n8nUrl = process.env.N8N_KONTAKT_WEBHOOK_URL;
    if (n8nUrl) {
      fetch(n8nUrl, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, email, betreff, nachricht, produkt_id, ip: ipForDb }),
      }).catch(err => console.error("[Kontakt] N8N-Fehler:", err));
    }

    // 5. Cookie löschen (verhindert Mehrfach-Attribution für denselben Affiliate)
    if (cookie) await clearAffiliateCookie().catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API POST /kontakt]", err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
