import { Resend } from "resend";
import type { SendEmailOptions } from "./types";

/**
 * Resend Email-Provider.
 *
 * Verwendet die offizielle Resend-SDK. Domain muss in Resend verifiziert sein
 * (DNS-Records SPF + DKIM gesetzt) bevor From-Address akzeptiert wird.
 *
 * ENV-Variablen:
 *   RESEND_API_KEY        — re_*** (Resend Dashboard → API Keys)
 *   EMAIL_FROM            — z.B. noreply@galeriedutemps.kz (verifizierte Domain!)
 *   EMAIL_FROM_NAME       — Display-Name, default "Galerie du Temps"
 *
 * Singleton-Client: wird beim ersten Aufruf erzeugt + gecached.
 */

let cached: Resend | null = null;
function getClient(): Resend | null {
  if (cached) return cached;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  cached = new Resend(apiKey);
  return cached;
}

export async function sendViaResend(opts: SendEmailOptions): Promise<void> {
  const client = getClient();
  if (!client) {
    console.warn("[Resend] RESEND_API_KEY nicht gesetzt — E-Mail wird übersprungen");
    if (process.env.NODE_ENV === "development") {
      console.log("[Resend DEV] Würde senden:", { to: opts.to, subject: opts.subject });
    }
    return;
  }

  const fromEmail = process.env.EMAIL_FROM      ?? "noreply@galeriedutemps.kz";
  const fromName  = process.env.EMAIL_FROM_NAME ?? "Galerie du Temps";

  // Resend erwartet "Name <email@domain>" Format ODER nur email-Adresse
  const from = `${fromName} <${fromEmail}>`;
  // Resend "to": Array von Strings; wir mappen aus {email, name} unsere Form
  const to   = opts.to.map(e => e.name ? `${e.name} <${e.email}>` : e.email);

  const { error } = await client.emails.send({
    from,
    to,
    subject:  opts.subject,
    html:     opts.htmlContent,
    text:     opts.textContent,
    replyTo:  opts.replyTo
      ? (opts.replyTo.name ? `${opts.replyTo.name} <${opts.replyTo.email}>` : opts.replyTo.email)
      : undefined,
    // Resend nutzt "tags" als Array von {name, value} Objekten — wir
    // mappen einfache string-Tags auf das Format.
    tags: opts.tags?.map(t => ({ name: "tag", value: t.slice(0, 256) })),
  });

  if (error) {
    throw new Error(`[Resend] ${error.name}: ${error.message}`);
  }
}
