"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { customerProfilAktualisieren } from "@/lib/db/customers";

const ProfilSchema = z.object({
  vorname:    z.string().min(2).max(100),
  nachname:   z.string().min(2).max(100),
  telefon:    z.string().max(50).optional(),
  geburtsdatum: z.string().optional(),
  newsletter: z.coerce.boolean(),
  // Billing
  strasse:    z.string().max(200).optional(),
  plz:        z.string().max(10).optional(),
  ort:        z.string().max(100).optional(),
  land:       z.string().max(2).default("DE"),
});

export type ProfilState = { ok?: boolean; fehler?: string; errors?: Record<string, string[]> } | null;

export async function profilSpeichernAction(
  _prev: ProfilState,
  formData: FormData
): Promise<ProfilState> {
  const session = await auth();
  if (!session || session.user?.role !== "customer") return { fehler: "Nicht angemeldet" };

  const parsed = ProfilSchema.safeParse({
    vorname:      formData.get("vorname"),
    nachname:     formData.get("nachname"),
    telefon:      formData.get("telefon"),
    geburtsdatum: formData.get("geburtsdatum") || undefined,
    newsletter:   formData.get("newsletter") === "on",
    strasse:      formData.get("strasse"),
    plz:          formData.get("plz"),
    ort:          formData.get("ort"),
    land:         formData.get("land") || "DE",
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const d = parsed.data;
  await customerProfilAktualisieren(session.user.id, {
    vorname:  d.vorname,
    nachname: d.nachname,
    telefon:  d.telefon,
    newsletter_aktiv: d.newsletter,
    geburtsdatum: d.geburtsdatum ?? null,
    billing_address: {
      vorname:  d.vorname,
      nachname: d.nachname,
      strasse:  d.strasse ?? "",
      plz:      d.plz ?? "",
      ort:      d.ort ?? "",
      land:     d.land,
    },
  });

  revalidatePath("/kunde/profil");
  return { ok: true };
}
