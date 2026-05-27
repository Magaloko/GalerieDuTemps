"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { customerErstellen, customerByEmail } from "@/lib/db/customers";
import { emailConfirmationTokenSetzen } from "@/lib/db/customer-auth";
import { sendEmail } from "@/lib/email";
import { emailBestaetigungMail, b2bWelcomeMail } from "@/lib/email/customer-templates";
import { siteUrl } from "@/lib/site-url";

const BaseSchema = z.object({
  vorname:  z.string().min(2).max(100),
  nachname: z.string().min(2).max(100),
  email:    z.string().email(),
  passwort: z.string().min(8),
  passwort_wdh: z.string().min(8),
  agb_akzeptiert: z.literal("on", { message: "Подтвердите согласие с условиями" }),
}).refine(d => d.passwort === d.passwort_wdh, {
  message: "Пароли не совпадают",
  path:    ["passwort_wdh"],
});

const B2bSchema = BaseSchema.safeExtend({
  company_name: z.string().min(2, "Название компании обязательно"),
  ust_id:       z.string().optional(),
  company_note: z.string().optional(),
}).refine(d => d.ust_id || (d.company_note && d.company_note.length > 10), {
  message: "Укажите БИН/ИИН или комментарий (минимум 10 символов)",
  path:    ["ust_id"],
});

export type RegistrierungsState = {
  errors?:  Record<string, string[]>;
  fehler?:  string;
} | null;

export async function customerRegistrierenAction(
  _prev: RegistrierungsState,
  formData: FormData
): Promise<RegistrierungsState> {
  const tab = formData.get("tab") === "business" ? "business" : "privat";
  const isB2B = tab === "business";

  const raw = {
    vorname:        formData.get("vorname"),
    nachname:       formData.get("nachname"),
    email:          formData.get("email"),
    passwort:       formData.get("passwort"),
    passwort_wdh:   formData.get("passwort_wdh"),
    agb_akzeptiert: formData.get("agb_akzeptiert"),
    company_name:   formData.get("company_name"),
    ust_id:         formData.get("ust_id"),
    company_note:   formData.get("company_note"),
  };

  const parsed = isB2B
    ? B2bSchema.safeParse(raw)
    : BaseSchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const data = parsed.data as typeof raw & {
    vorname: string; nachname: string; email: string; passwort: string;
    company_name?: string; ust_id?: string; company_note?: string;
  };

  const existing = await customerByEmail(data.email);
  if (existing) {
    return { fehler: "Этот e-mail уже зарегистрирован. Войдите или восстановите пароль." };
  }

  const passwortHash = await bcrypt.hash(data.passwort, 12);
  const customer = await customerErstellen({
    email:          data.email,
    passwort_hash:  passwortHash,
    vorname:        data.vorname,
    nachname:       data.nachname,
    customer_type:  isB2B ? "b2b_pending" : "b2c",
    company_name:   isB2B ? data.company_name : undefined,
    ust_id:         isB2B ? data.ust_id        : undefined,
    company_note:   isB2B ? data.company_note  : undefined,
    agb_akzeptiert: true,
  });

  // E-Mail-Bestätigungs-Mail
  const token = await emailConfirmationTokenSetzen(customer.id);
  const url   = siteUrl(`/kunde/bestaetigt?token=${token}`);
  sendEmail({
    to: [{ email: customer.email, name: `${customer.vorname} ${customer.nachname}` }],
    subject: "Подтвердите ваш e-mail · Galerie du Temps",
    htmlContent: emailBestaetigungMail(customer.vorname ?? "", url),
    tags: ["customer-confirm"],
  }).catch(err => console.error("[Registrierung] Brevo:", err));

  // Bei B2B zusätzlich Welcome-Mail
  if (isB2B && data.company_name) {
    sendEmail({
      to: [{ email: customer.email, name: `${customer.vorname} ${customer.nachname}` }],
      subject: "B2B-заявка принята · Galerie du Temps",
      htmlContent: b2bWelcomeMail(customer.vorname ?? "", data.company_name),
      tags: ["b2b-pending"],
    }).catch(err => console.error("[Registrierung B2B] Brevo:", err));
  }

  redirect(`/kunde/registrieren/erfolg?tab=${tab}`);
}
