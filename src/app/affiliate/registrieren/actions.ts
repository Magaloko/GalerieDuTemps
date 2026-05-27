"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  affiliateByEmail,
  affiliateByReferralCode,
  affiliateErstellen,
} from "@/lib/db/affiliates";
import { generateUniqueReferralCode } from "@/lib/affiliate/referral-code";
import { affiliateEinstellungenLaden } from "@/lib/db/affiliate-settings";
import { sendEmail } from "@/lib/email";

const RegistrierungsSchema = z.object({
  vorname:           z.string().min(2).max(100),
  nachname:          z.string().min(2).max(100),
  email:             z.string().email(),
  passwort:          z.string().min(8, "Mindestens 8 Zeichen"),
  passwort_wdh:      z.string().min(8),
  sponsor_code:      z.string().optional(),
  ist_kleinunternehmer: z.coerce.boolean(),
  gewerbe_angemeldet:   z.coerce.boolean(),
  agb_akzeptiert:    z.literal("on", { message: "Bitte AGB akzeptieren" }),
  datenschutz_akzeptiert: z.literal("on", { message: "Bitte Datenschutz akzeptieren" }),
}).refine(d => d.passwort === d.passwort_wdh, {
  message: "Passwörter stimmen nicht überein",
  path:    ["passwort_wdh"],
}).refine(d => d.ist_kleinunternehmer || d.gewerbe_angemeldet, {
  message: "Du musst entweder Kleinunternehmer oder Gewerbetreibender sein",
  path:    ["gewerbe_angemeldet"],
});

export type RegistrierungsState = {
  errors?: Record<string, string[]>;
  fehler?: string;
} | null;

export async function registrierenAction(
  _prev: RegistrierungsState,
  formData: FormData
): Promise<RegistrierungsState> {
  const settings = await affiliateEinstellungenLaden();
  if (!settings.registrierung_offen) {
    return { fehler: "Die Registrierung ist aktuell geschlossen." };
  }

  const parsed = RegistrierungsSchema.safeParse({
    vorname:              formData.get("vorname"),
    nachname:             formData.get("nachname"),
    email:                formData.get("email"),
    passwort:             formData.get("passwort"),
    passwort_wdh:         formData.get("passwort_wdh"),
    sponsor_code:         formData.get("sponsor_code") || undefined,
    ist_kleinunternehmer: formData.get("ist_kleinunternehmer") === "on",
    gewerbe_angemeldet:   formData.get("gewerbe_angemeldet")   === "on",
    agb_akzeptiert:       formData.get("agb_akzeptiert"),
    datenschutz_akzeptiert: formData.get("datenschutz_akzeptiert"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const data = parsed.data;

  // Duplikat-Check
  const existing = await affiliateByEmail(data.email);
  if (existing) return { fehler: "Diese E-Mail ist bereits registriert. Logge dich an oder nutze Passwort-Reset." };

  // Sponsor-Lookup (optional)
  let sponsorId: string | null = null;
  if (data.sponsor_code) {
    const sponsor = await affiliateByReferralCode(data.sponsor_code);
    if (!sponsor) {
      return { errors: { sponsor_code: ["Sponsor-Code ungültig oder Account nicht aktiv"] } };
    }
    sponsorId = sponsor.id;
  }

  // Account anlegen
  const passwortHash = await bcrypt.hash(data.passwort, 12);
  const referralCode = await generateUniqueReferralCode();

  const aff = await affiliateErstellen({
    email:                data.email,
    passwort_hash:        passwortHash,
    vorname:              data.vorname,
    nachname:             data.nachname,
    referral_code:        referralCode,
    sponsor_id:           sponsorId,
    agb_version:          settings.agb_aktuelle_version,
    ist_kleinunternehmer: data.ist_kleinunternehmer,
    gewerbe_angemeldet:   data.gewerbe_angemeldet,
  });

  // Welcome-Mail (Best-Effort)
  sendEmail({
    to:      [{ email: aff.email, name: `${aff.vorname} ${aff.nachname}` }],
    subject: "Willkommen im Galerie du Temps Partner-Programm",
    htmlContent: welcomeMail(aff.vorname, aff.referral_code),
    tags:    ["affiliate-welcome"],
  }).catch(err => console.error("[Registrierung] Brevo-Fehler:", err));

  redirect("/affiliate/registrieren/erfolg");
}

function welcomeMail(vorname: string, referralCode: string): string {
  return `
    <!DOCTYPE html>
    <html lang="de">
    <body style="font-family: Georgia, serif; background: #F5F0E8; margin: 0; padding: 40px 20px;">
      <div style="max-width: 520px; margin: 0 auto; background: #FDFAF5; border: 1px solid #C9B89A; padding: 48px;">
        <p style="color: #C9A84C; font-size: 20px; text-align: center; margin: 0 0 8px;">✦</p>
        <h1 style="color: #4A2C1A; font-size: 28px; text-align: center; margin: 0 0 32px; font-weight: normal;">
          Willkommen bei Galerie du Temps
        </h1>
        <p style="color: #4A2C1A;">Hallo ${vorname},</p>
        <p style="color: #4A2C1A; line-height: 1.7;">
          danke für deine Anmeldung im Partner-Programm! Dein Account wird in Kürze geprüft
          und freigeschaltet. Sobald das erledigt ist, erhältst du eine weitere Mail
          und kannst loslegen.
        </p>
        <div style="background: #E8DFD0; border-left: 3px solid #C9A84C; padding: 16px 20px; margin: 24px 0;">
          <p style="margin: 0; color: #8B6F47; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Dein Referral-Code</p>
          <p style="margin: 8px 0 0; color: #4A2C1A; font-family: monospace; font-size: 24px; letter-spacing: 4px;">${referralCode}</p>
        </div>
        <p style="color: #8B6F47; line-height: 1.7;">Herzlich,<br><strong style="color: #4A2C1A;">Galerie du Temps Team</strong></p>
      </div>
    </body>
    </html>
  `.trim();
}
