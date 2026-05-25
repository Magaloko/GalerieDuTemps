import { NextRequest, NextResponse } from "next/server";
import { affiliateByReferralCode } from "@/lib/db/affiliates";
import { klickLoggen } from "@/lib/db/affiliate-tracking";
import { affiliateEinstellungenLaden } from "@/lib/db/affiliate-settings";
import { hashWithSalt, istBot } from "@/lib/affiliate/cookie";
import { isValidReferralCode } from "@/lib/affiliate/referral-code";
import { rateLimitPruefen, getClientIp } from "@/lib/utils/rate-limit";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /r/[code] – Short-Link-Redirector
// 1. Validiert Code-Format
// 2. Rate-Limit (Spam-Schutz)
// 3. Lädt Affiliate aus DB
// 4. Loggt Klick + setzt Cookie (HttpOnly, 30 Tage)
// 5. Redirect zur Zielseite (default: /, override via ?to=...)
// ---------------------------------------------------------------------------
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code }       = await params;
  const codeUp         = code.toUpperCase();
  const ziel           = req.nextUrl.searchParams.get("to") ?? "/";
  const homeUrl        = new URL("/", req.nextUrl);

  // 1. Format prüfen
  if (!isValidReferralCode(codeUp)) {
    return NextResponse.redirect(homeUrl);
  }

  // 2. Rate-Limit (verhindert Klick-Spam)
  const ip = getClientIp(req);
  const rl = rateLimitPruefen(`ref-click:${ip}`, 30, 60 * 1000);
  if (!rl.erlaubt) {
    return NextResponse.redirect(homeUrl);
  }

  // 3. Affiliate laden
  const affiliate = await affiliateByReferralCode(codeUp).catch(() => null);
  if (!affiliate) {
    // Code existiert nicht / Affiliate nicht aktiv → einfach zur Hauptseite
    return NextResponse.redirect(homeUrl);
  }

  // 4. Bot-Erkennung + Klick-Log (fire-and-forget)
  const userAgent = req.headers.get("user-agent") ?? "";
  const referer   = req.headers.get("referer")    ?? null;
  const istBotReq = istBot(userAgent);

  const ipHash    = ip !== "unknown" ? hashWithSalt(ip)        : null;
  const uaHash    = userAgent        ? hashWithSalt(userAgent) : null;

  // Klick async loggen (blockt Redirect nicht)
  const klickPromise = klickLoggen({
    referral_code: codeUp,
    affiliate_id:  affiliate.id,
    ip_hash:       ipHash,
    ua_hash:       uaHash,
    referer,
    landing_url:   ziel,
    user_agent:    userAgent.slice(0, 500),
    ist_bot:       istBotReq,
  });

  // Für Bots: kein Cookie setzen, nur redirect
  if (istBotReq) {
    return NextResponse.redirect(new URL(ziel, req.nextUrl));
  }

  // 5. Auf Klick-ID warten (max. 1s) für Cookie-Verknüpfung
  let klickId: number | null = null;
  try {
    klickId = await Promise.race([
      klickPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
    ]);
  } catch {
    klickId = null;
  }

  // Settings für Cookie-TTL
  const settings = await affiliateEinstellungenLaden();

  // DSGVO: Consent-Check (vm_consent_aff=1)
  const consentOk = req.cookies.get("vm_consent_aff")?.value === "1";

  // Response mit Cookie + Redirect
  const response = NextResponse.redirect(new URL(ziel, req.nextUrl));
  if (consentOk) {
    response.cookies.set("aff_ref", JSON.stringify({
      code:     codeUp,
      klick_id: klickId,
      set_at:   Date.now(),
    }), {
      httpOnly: true,
      sameSite: "lax",
      secure:   process.env.NODE_ENV === "production",
      path:     "/",
      maxAge:   settings.cookie_ttl_tage * 24 * 60 * 60,
    });
  }
  // Ohne Consent: Klick wurde geloggt, aber kein Cookie gesetzt → keine Attribution
  // Der User wird beim ersten Banner-Aufruf entscheiden können.

  return response;
}
