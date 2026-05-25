"use server";

import { z } from "zod";
import { passwortResetTokenSetzen, passwortResetEinloesen } from "@/lib/db/customer-auth";
import { customerByEmail } from "@/lib/db/customers";
import { sendEmail } from "@/lib/email/brevo";
import { passwortResetMail } from "@/lib/email/customer-templates";
import bcrypt from "bcryptjs";

export async function passwortVergessenAction(
  _prev: { ok?: boolean; fehler?: string } | null,
  formData: FormData
): Promise<{ ok?: boolean; fehler?: string }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) {
    return { fehler: "Ungültige E-Mail" };
  }

  const customer = await customerByEmail(email);
  // Auch bei nicht existierendem Account: success-Response (User-Enumeration verhindern)
  if (customer) {
    const token = await passwortResetTokenSetzen(email);
    if (token) {
      const url = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/kunde/passwort-neu?token=${token}`;
      sendEmail({
        to: [{ email, name: customer.vorname ?? email }],
        subject: "Passwort zurücksetzen – Galerie du Temps",
        htmlContent: passwortResetMail(customer.vorname ?? "", url),
        tags: ["password-reset"],
      }).catch(err => console.error("[PW-Reset] Brevo:", err));
    }
  }

  return { ok: true };
}

const NeuesPasswortSchema = z.object({
  token:          z.string().min(20),
  neues_passwort: z.string().min(8),
  wdh:            z.string(),
}).refine(d => d.neues_passwort === d.wdh, {
  message: "Passwörter stimmen nicht überein",
  path:    ["wdh"],
});

export async function passwortNeuSetzenAction(
  _prev: { ok?: boolean; fehler?: string } | null,
  formData: FormData
): Promise<{ ok?: boolean; fehler?: string }> {
  const parsed = NeuesPasswortSchema.safeParse({
    token:          formData.get("token"),
    neues_passwort: formData.get("neues_passwort"),
    wdh:            formData.get("wdh"),
  });
  if (!parsed.success) {
    return { fehler: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }

  const hash = await bcrypt.hash(parsed.data.neues_passwort, 12);
  const ok   = await passwortResetEinloesen(parsed.data.token, hash);
  if (!ok) return { fehler: "Link ungültig oder abgelaufen. Bitte erneut anfordern." };

  return { ok: true };
}
