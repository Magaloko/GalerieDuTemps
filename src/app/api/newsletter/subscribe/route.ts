import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { subscribePrepare } from "@/lib/db/newsletter";
import { sendEmail } from "@/lib/email";
import { rateLimitAsync, getClientIp, tooManyRequestsResponse } from "@/lib/utils/rate-limit";

export const dynamic = "force-dynamic";

const SubscribeSchema = z.object({
  email:   z.string().email(),
  vorname: z.string().max(100).optional(),
  quelle:  z.string().max(50).optional(),
});

export async function POST(req: NextRequest) {
  // Rate-Limit: 5 Anmeldungen / Stunde / IP
  const ip = getClientIp(req);
  const rl = await rateLimitAsync(`newsletter:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.erlaubt) return tooManyRequestsResponse(rl);

  try {
    const body   = await req.json();
    const parsed = SubscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Ungültige E-Mail" }, { status: 400 });
    }

    const { token } = await subscribePrepare(parsed.data);
    const url = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/newsletter/bestaetigt?token=${token}`;

    // Bestätigungs-Mail
    await sendEmail({
      to:          [{ email: parsed.data.email, name: parsed.data.vorname ?? "" }],
      subject:     "Bitte bestätige deine Newsletter-Anmeldung",
      htmlContent: bestaetigungsMail(parsed.data.vorname ?? "", url),
      tags:        ["newsletter-confirm"],
    }).catch(err => console.error("[Newsletter] Brevo:", err));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API Newsletter Subscribe]", err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}

function bestaetigungsMail(vorname: string, url: string): string {
  return `
    <!DOCTYPE html><html lang="de"><body style="font-family: Georgia, serif; background: #F5F0E8; margin: 0; padding: 40px 20px;">
      <div style="max-width: 520px; margin: 0 auto; background: #FDFAF5; border: 1px solid #C9B89A; padding: 48px;">
        <p style="color: #C9A84C; font-size: 20px; text-align: center; margin: 0 0 8px;">✦</p>
        <h1 style="color: #4A2C1A; font-size: 26px; text-align: center; margin: 0 0 24px; font-weight: normal;">
          Newsletter bestätigen
        </h1>
        <p style="color: #4A2C1A;">Hallo${vorname ? ` ${vorname}` : ""},</p>
        <p style="color: #4A2C1A; line-height: 1.7;">
          klick auf den Button unten, um deine Anmeldung zum Galerie du Temps Newsletter
          zu bestätigen. Als Willkommens-Geschenk bekommst du danach einen Coupon.
        </p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${url}" style="display: inline-block; padding: 14px 32px; background: #4A2C1A; color: #F5F0E8; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 3px;">
            Newsletter bestätigen
          </a>
        </p>
        <p style="color: #8B6F47; font-size: 12px; line-height: 1.6;">
          Falls du dich nicht angemeldet hast, ignoriere diese E-Mail. Der Link ist 48h gültig.
        </p>
      </div>
    </body></html>
  `;
}
