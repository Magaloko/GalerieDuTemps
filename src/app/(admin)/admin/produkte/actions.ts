"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { produktErstellen, produktAktualisieren, produktLoeschen } from "@/lib/db/produkte";
import { ProduktCreateSchema } from "@/lib/utils/validierung";

export type FormState = {
  errors?: Record<string, string[]>;
  message?: string;
} | null;

// ---------------------------------------------------------------------------
// Produkt erstellen
// ---------------------------------------------------------------------------
export async function produktErstellenAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await auth();
  if (!session) return { message: "Nicht angemeldet" };

  const raw = {
    name:             formData.get("name"),
    slug:             formData.get("slug")          || undefined,
    artikel_code:     formData.get("artikel_code")  || undefined,
    beschreibung:     formData.get("beschreibung"),
    kurzbeschreibung: formData.get("kurzbeschreibung"),
    preis:            formData.get("preis"),
    originalpreis:    formData.get("originalpreis") || undefined,
    kategorie_id:     formData.get("kategorie_id")  || undefined,
    zustand:          formData.get("zustand"),
    era:              formData.get("era")            || undefined,
    herkunft:         formData.get("herkunft")       || undefined,
    material:         formData.get("material")       || undefined,
    lagerbestand:     formData.get("lagerbestand"),
    featured:         formData.get("featured") === "true",
    verkauft:         formData.get("verkauft")  === "true",
    aktiv:            formData.get("aktiv")     !== "false",
    b2c_mode:         (formData.get("b2c_mode") as string) || "visible",
    seo_titel:        formData.get("seo_titel")      || undefined,
    seo_beschreibung: formData.get("seo_beschreibung") || undefined,
    tags:             formData.get("tags")           || undefined,
  };

  const parsed = ProduktCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const produkt = await produktErstellen(parsed.data, session.user.id);
  redirect(`/admin/produkte/${produkt.id}`);
}

// ---------------------------------------------------------------------------
// Produkt aktualisieren
// ---------------------------------------------------------------------------
export async function produktAktualisierenAction(
  id: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await auth();
  if (!session) return { message: "Nicht angemeldet" };

  const raw = {
    name:             formData.get("name"),
    beschreibung:     formData.get("beschreibung"),
    kurzbeschreibung: formData.get("kurzbeschreibung"),
    preis:            formData.get("preis"),
    originalpreis:    formData.get("originalpreis") || undefined,
    kategorie_id:     formData.get("kategorie_id")  || undefined,
    zustand:          formData.get("zustand"),
    era:              formData.get("era")            || undefined,
    herkunft:         formData.get("herkunft")       || undefined,
    material:         formData.get("material")       || undefined,
    lagerbestand:     formData.get("lagerbestand"),
    featured:         formData.get("featured") === "true",
    verkauft:         formData.get("verkauft")  === "true",
    seo_titel:        formData.get("seo_titel")        || undefined,
    seo_beschreibung: formData.get("seo_beschreibung") || undefined,
    tags:             formData.get("tags")             || undefined,
  };

  const parsed = ProduktCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  await produktAktualisieren(id, parsed.data);
  return { message: "Produkt erfolgreich gespeichert." };
}

// ---------------------------------------------------------------------------
// Produkt löschen
// ---------------------------------------------------------------------------
export async function produktLoeschenAction(id: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Nicht angemeldet");
  await produktLoeschen(id);
  redirect("/admin/produkte");
}
