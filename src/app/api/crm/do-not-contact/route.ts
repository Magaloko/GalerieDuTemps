import { NextRequest, NextResponse } from "next/server";
import { dncPerToken } from "@/lib/db/crm";

export const dynamic = "force-dynamic";

/**
 * 1-Klick-Unsubscribe per Token (DSGVO)
 * Token aus E-Mail-Footer: ?token=xxx
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return new Response(htmlSeite("Fehler", "Kein Token angegeben."), {
      status: 400, headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const ok = await dncPerToken(token, "Per 1-Klick-Link aus E-Mail").catch(() => false);

  return new Response(
    ok
      ? htmlSeite(
          "Erfolgreich abgemeldet",
          "Du erhältst künftig keine Marketing-E-Mails mehr von uns.<br><br>Bei Fragen melde dich jederzeit unter <a href='mailto:hallo@galeriedutemps.kz'>hallo@galeriedutemps.kz</a>."
        )
      : htmlSeite("Link ungültig", "Der Link ist ungültig oder abgelaufen."),
    { status: ok ? 200 : 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

function htmlSeite(titel: string, msg: string): string {
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="utf-8">
      <title>${titel} – Galerie du Temps</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Georgia, serif; background: #F5F0E8; margin: 0; padding: 40px 20px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .card { max-width: 480px; background: #FDFAF5; border: 1px solid #C9B89A; padding: 48px; text-align: center; border-radius: 4px; }
        .star { color: #C9A84C; font-size: 24px; margin: 0 0 16px; }
        h1 { color: #4A2C1A; font-size: 26px; font-weight: normal; margin: 0 0 24px; }
        p { color: #8B6F47; line-height: 1.7; }
        a { color: #4A2C1A; }
      </style>
    </head>
    <body>
      <div class="card">
        <p class="star">✦</p>
        <h1>${titel}</h1>
        <p>${msg}</p>
      </div>
    </body>
    </html>
  `;
}
