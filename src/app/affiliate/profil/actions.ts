"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import { profilAktualisieren, ibanSpeichern } from "@/lib/db/affiliates";
import { z } from "zod";
import {
  istValideIIN,
  istValideBIN,
  istValideIIC,
  istValiderBIK,
  istValideTelefon,
} from "@/lib/kz/validate";

const ProfilSchema = z.object({
  vorname:              z.string().min(2).max(100),
  nachname:             z.string().min(2).max(100),
  auszahlungs_methode:  z.enum(["sepa", "paypal", "kaspi", "iic_transfer"]),
  paypal_email:         z.string().email().optional().or(z.literal("")),
  iban:                 z.string().optional(),
  bic:                  z.string().max(11).optional(),
  kontoinhaber:         z.string().max(200).optional(),
  steuer_id:            z.string().max(20).optional(),
  ist_kleinunternehmer: z.coerce.boolean(),
  gewerbe_angemeldet:   z.coerce.boolean(),
  // KZ-spezifisch
  iic:                  z.string().optional(),
  bik:                  z.string().optional(),
  iin_affiliate:        z.string().optional(),
  bin_affiliate:        z.string().optional(),
  kaspi_telefon:        z.string().optional(),
});

export type ProfilState = {
  ok?: boolean;
  errors?: Record<string, string[]>;
  fehler?: string;
} | null;

export async function profilAktualisierenAction(
  _prev: ProfilState,
  formData: FormData
): Promise<ProfilState> {
  const session = await auth();
  if (!session || session.user?.role !== "affiliate") {
    return { fehler: "Не авторизован" };
  }

  const parsed = ProfilSchema.safeParse({
    vorname:              formData.get("vorname"),
    nachname:             formData.get("nachname"),
    auszahlungs_methode:  formData.get("auszahlungs_methode"),
    paypal_email:         formData.get("paypal_email"),
    iban:                 formData.get("iban") || undefined,
    bic:                  formData.get("bic")  || undefined,
    kontoinhaber:         formData.get("kontoinhaber") || undefined,
    steuer_id:            formData.get("steuer_id") || undefined,
    ist_kleinunternehmer: formData.get("ist_kleinunternehmer") === "on",
    gewerbe_angemeldet:   formData.get("gewerbe_angemeldet")   === "on",
    iic:                  formData.get("iic")           || undefined,
    bik:                  formData.get("bik")           || undefined,
    iin_affiliate:        formData.get("iin_affiliate") || undefined,
    bin_affiliate:        formData.get("bin_affiliate") || undefined,
    kaspi_telefon:        formData.get("kaspi_telefon") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const data = parsed.data;
  const id = session.user.id;

  // KZ-spezifische Format-Validierung (nur wenn Wert vorhanden)
  const errors: Record<string, string[]> = {};
  if (data.auszahlungs_methode === "iic_transfer") {
    if (!data.iic || !istValideIIC(data.iic)) {
      errors.iic = ["ИИК должен начинаться с KZ и содержать 20 символов"];
    }
    if (!data.bik || !istValiderBIK(data.bik)) {
      errors.bik = ["БИК — 8 символов (буквы и цифры)"];
    }
  }
  if (data.auszahlungs_methode === "kaspi") {
    if (!data.kaspi_telefon || !istValideTelefon(data.kaspi_telefon)) {
      errors.kaspi_telefon = ["Номер Kaspi в формате +7 7XX XXX XX XX"];
    }
  }
  if (data.iin_affiliate && !istValideIIN(data.iin_affiliate)) {
    errors.iin_affiliate = ["ИИН должен содержать 12 цифр"];
  }
  if (data.bin_affiliate && !istValideBIN(data.bin_affiliate)) {
    errors.bin_affiliate = ["БИН должен содержать 12 цифр"];
  }
  if (Object.keys(errors).length > 0) return { errors };

  await profilAktualisieren(id, {
    vorname:              data.vorname,
    nachname:             data.nachname,
    auszahlungs_methode:  data.auszahlungs_methode,
    paypal_email:         data.paypal_email || null,
    bic:                  data.bic || null,
    kontoinhaber:         data.kontoinhaber || null,
    steuer_id:            data.steuer_id || null,
    ist_kleinunternehmer: data.ist_kleinunternehmer,
    gewerbe_angemeldet:   data.gewerbe_angemeldet,
    iic:                  data.iic ? data.iic.replace(/\s/g, "").toUpperCase() : null,
    bik:                  data.bik ? data.bik.toUpperCase() : null,
    iin_affiliate:        data.iin_affiliate || null,
    bin_affiliate:        data.bin_affiliate || null,
    kaspi_telefon:        data.kaspi_telefon ? data.kaspi_telefon.replace(/\D/g, "") : null,
  });

  // IBAN verschlüsselt speichern (nur wenn SEPA-Methode und Wert gesetzt) — KZ braucht das nicht
  if (data.auszahlungs_methode === "sepa" && data.iban && data.iban.replace(/\s/g, "").length >= 15) {
    const key = process.env.IBAN_ENCRYPTION_KEY;
    if (!key) {
      return { fehler: "IBAN не может быть сохранён: ключ шифрования отсутствует (обратитесь к админу)" };
    }
    await ibanSpeichern(id, data.iban.replace(/\s/g, ""), key);
  }

  revalidatePath("/affiliate/profil");
  return { ok: true };
}
