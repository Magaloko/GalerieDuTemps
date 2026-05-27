import type { EmailEmpfaenger, SendEmailOptions } from "./types";

const BREVO_API_URL = "https://api.brevo.com/v3";

/** Sendet eine transaktionale E-Mail via Brevo HTTP API */
export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.warn("[Brevo] BREVO_API_KEY nicht gesetzt – E-Mail wird übersprungen");
    if (process.env.NODE_ENV === "development") {
      console.log("[Brevo DEV] Würde senden:", {
        to: opts.to, subject: opts.subject,
      });
    }
    return;
  }

  const res = await fetch(`${BREVO_API_URL}/smtp/email`, {
    method:  "POST",
    headers: {
      "api-key":      apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: process.env.BREVO_SENDER_EMAIL ?? "noreply@galeriedutemps.kz",
        name:  process.env.BREVO_SENDER_NAME  ?? "Galerie du Temps",
      },
      to:          opts.to,
      subject:     opts.subject,
      htmlContent: opts.htmlContent,
      textContent: opts.textContent,
      replyTo:     opts.replyTo,
      tags:        opts.tags,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`[Brevo] Fehler ${res.status}: ${JSON.stringify(body)}`);
  }
}

// ---------------------------------------------------------------------------
// Template: Kontaktbestätigung an Kunden
// ---------------------------------------------------------------------------
export function kontaktBestaetigung(name: string, nachricht: string): string {
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head><meta charset="utf-8"><title>Ihre Nachricht bei Galerie du Temps</title></head>
    <body style="font-family: Georgia, serif; background: #F5F0E8; margin: 0; padding: 40px 20px;">
      <div style="max-width: 520px; margin: 0 auto; background: #FDFAF5;
                  border: 1px solid #C9B89A; padding: 48px;">
        <p style="color: #C9A84C; font-size: 20px; text-align: center; margin: 0 0 8px;">✦</p>
        <h1 style="color: #4A2C1A; font-size: 28px; text-align: center;
                   margin: 0 0 32px; font-weight: normal;">
          Galerie du Temps
        </h1>
        <p style="color: #4A2C1A; font-size: 16px;">Liebe/r ${name},</p>
        <p style="color: #4A2C1A; line-height: 1.7;">
          vielen Dank für Ihre Nachricht! Wir haben Ihre Anfrage erhalten und
          werden uns innerhalb von <strong>24–48 Stunden</strong> bei Ihnen melden.
        </p>
        <div style="border-left: 3px solid #C9A84C; padding: 16px 20px;
                    background: #E8DFD0; margin: 24px 0; color: #8B6F47;
                    font-style: italic; line-height: 1.6;">
          "${nachricht.slice(0, 300)}${nachricht.length > 300 ? "…" : ""}"
        </div>
        <p style="color: #8B6F47; line-height: 1.7;">
          Mit freundlichen Grüßen,<br>
          <strong style="color: #4A2C1A;">Ihr Galerie du Temps Team</strong>
        </p>
        <hr style="border: none; border-top: 1px solid #E8DFD0; margin: 32px 0;">
        <p style="color: #9B9B9B; font-size: 12px; text-align: center;">
          Galerie du Temps · Hochwertige Vintage-Stücke mit Geschichte
        </p>
      </div>
    </body>
    </html>
  `.trim();
}
