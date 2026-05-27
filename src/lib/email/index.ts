/**
 * Email-Provider-Switcher.
 *
 * Selektiert den aktiven Provider via ENV `EMAIL_PROVIDER`:
 *   resend → src/lib/email/resend.ts
 *   brevo  → src/lib/email/brevo.ts (default für Backwards-Compat)
 *
 * Alle Aufrufer importieren `sendEmail` von hier — der Switch ist
 * für sie transparent.
 *
 * ENV:
 *   EMAIL_PROVIDER    = "resend" | "brevo"   (default "brevo")
 *   RESEND_API_KEY    = re_***               (für resend)
 *   BREVO_API_KEY     = xkeysib-***          (für brevo)
 *   EMAIL_FROM        = noreply@galeriedutemps.kz
 *   EMAIL_FROM_NAME   = "Galerie du Temps"
 *
 * Dev-Modus (kein API-Key gesetzt): Provider loggt den Send-Versuch in
 * die Konsole und returnt erfolgreich. So fallen keine Tests/Routen aus
 * nur weil keine Email-Konfig da ist.
 */

import { sendEmail as sendViaBrevo } from "./brevo";
import { sendViaResend } from "./resend";
import type { SendEmailOptions } from "./types";

export type { EmailEmpfaenger, SendEmailOptions } from "./types";

type Provider = "resend" | "brevo";

function pickProvider(): Provider {
  const env = (process.env.EMAIL_PROVIDER ?? "").toLowerCase();
  if (env === "resend") return "resend";
  // Default: brevo (Backwards-Compat — bisherige Production hatte Brevo)
  return "brevo";
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const provider = pickProvider();
  try {
    if (provider === "resend") {
      await sendViaResend(opts);
    } else {
      await sendViaBrevo(opts);
    }
  } catch (err) {
    // Nie hart werfen für Email-Fehler — sonst gehen ganze Server-Actions
    // kaputt (z.B. Kontaktformular zeigt Error obwohl der Lead schon in
    // der DB ist). Loggen + weitermachen.
    console.error(`[email/${provider}] send failed:`, err);
  }
}

/* Templates re-exportieren — Templates sind Provider-agnostisch */
export { kontaktBestaetigung } from "./brevo";
