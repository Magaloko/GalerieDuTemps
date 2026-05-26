"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth, requireAdminSession } from "@/lib/auth/config";
import { produktErstellen, produktAktualisieren, produktLoeschen, produktById } from "@/lib/db/produkte";
import { ProduktCreateSchema } from "@/lib/utils/validierung";

export type FormState = {
  errors?: Record<string, string[]>;
  message?: string;
} | null;

// ---------------------------------------------------------------------------
// FormData → Input-Struktur (shared zwischen Erstellen + Aktualisieren).
// Wichtig: alle Felder müssen hier auftauchen, sonst gehen sie beim Edit verloren.
// ---------------------------------------------------------------------------
function parseProduktFormData(formData: FormData) {
  const abmessungen = (() => {
    const breite  = formData.get("abmessungen_breite");
    const hoehe   = formData.get("abmessungen_hoehe");
    const tiefe   = formData.get("abmessungen_tiefe");
    const gewicht = formData.get("abmessungen_gewicht");
    if (!breite && !hoehe && !tiefe && !gewicht) return undefined;
    return {
      breite:  breite  ? Number(breite)  : undefined,
      hoehe:   hoehe   ? Number(hoehe)   : undefined,
      tiefe:   tiefe   ? Number(tiefe)   : undefined,
      gewicht: gewicht ? Number(gewicht) : undefined,
    };
  })();

  return {
    name:             formData.get("name"),
    slug:             formData.get("slug")           || undefined,
    artikel_code:     formData.get("artikel_code")   || undefined,
    beschreibung:     formData.get("beschreibung"),
    kurzbeschreibung: formData.get("kurzbeschreibung"),
    preis:            formData.get("preis"),
    originalpreis:    formData.get("originalpreis")  || undefined,
    einkaufspreis:    formData.get("einkaufspreis")  || undefined,
    b2b_preis:        formData.get("b2b_preis")      || undefined,
    kategorie_id:     formData.get("kategorie_id")   || undefined,
    zustand:          formData.get("zustand"),
    era:              formData.get("era")            || undefined,
    herkunft:         formData.get("herkunft")       || undefined,
    material:         formData.get("material")       || undefined,
    lagerbestand:     formData.get("lagerbestand"),
    featured:         formData.get("featured") === "true",
    verkauft:         formData.get("verkauft")  === "true",
    aktiv:            formData.get("aktiv")     !== "false",
    b2c_mode:         (formData.get("b2c_mode") as string) || "visible",
    seo_titel:        formData.get("seo_titel")        || undefined,
    seo_beschreibung: formData.get("seo_beschreibung") || undefined,
    tags:             formData.get("tags")             || undefined,
    hauptbild_url:    formData.get("hauptbild_url") || undefined,
    rueckbild_url:    formData.get("rueckbild_url") || undefined,
    video_url:        formData.get("video_url")     || undefined,
    abmessungen,
  };
}

// ---------------------------------------------------------------------------
// Produkt erstellen
// ---------------------------------------------------------------------------
export async function produktErstellenAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdminSession();
  if (!session) return { message: "Нет прав" };

  const parsed = ProduktCreateSchema.safeParse(parseProduktFormData(formData));
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
  const session = await requireAdminSession();
  if (!session) return { message: "Нет прав" };

  const parsed = ProduktCreateSchema.safeParse(parseProduktFormData(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  await produktAktualisieren(id, parsed.data);
  return { message: "Produkt erfolgreich gespeichert." };
}

// ---------------------------------------------------------------------------
// Quick-Toggles für Listen-Aktionen — kein redirect, nur revalidatePath
// ---------------------------------------------------------------------------
type ToggleField = "aktiv" | "featured" | "verkauft";

export async function produktQuickToggleAction(
  id:    string,
  feld:  ToggleField,
  value: boolean
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };

  if (!["aktiv","featured","verkauft"].includes(feld)) {
    return { ok: false, error: "Ungültiges Feld" };
  }

  try {
    await produktAktualisieren(id, { [feld]: value });
    revalidatePath("/admin/produkte");
    return { ok: true };
  } catch (err) {
    console.error("[quickToggle]", err);
    return { ok: false, error: "Aktualisierung fehlgeschlagen" };
  }
}

// ---------------------------------------------------------------------------
// Produkt löschen
// ---------------------------------------------------------------------------
export async function produktLoeschenAction(id: string): Promise<void> {
  const session = await requireAdminSession();
  if (!session) throw new Error("Нет прав");
  await produktLoeschen(id);
  redirect("/admin/produkte");
}

// ---------------------------------------------------------------------------
// Produkt duplizieren — Kopiert alles außer slug/artikel_code, setzt verkauft=false,
// aktiv=false (damit Admin erst editieren kann bevor live)
// ---------------------------------------------------------------------------
export async function produktDuplizierenAction(id: string): Promise<void> {
  const session = await requireAdminSession();
  if (!session) throw new Error("Нет прав");

  const original = await produktById(id);
  if (!original) throw new Error("Produkt nicht gefunden");

  const kopie = await produktErstellen(
    {
      name:             `${original.name} (Kopie)`,
      // slug + artikel_code: leer → wird auto-generiert / bleibt null
      beschreibung:     original.beschreibung      ?? undefined,
      kurzbeschreibung: original.kurzbeschreibung  ?? undefined,
      preis:            original.preis,
      originalpreis:    original.originalpreis     ?? undefined,
      einkaufspreis:    original.einkaufspreis     ?? undefined,
      b2b_preis:        original.b2b_preis         ?? undefined,
      waehrung:         original.waehrung,
      kategorie_id:     original.kategorie_id      ?? undefined,
      zustand:          original.zustand,
      era:              original.era               ?? undefined,
      herkunft:         original.herkunft          ?? undefined,
      material:         original.material          ?? undefined,
      lagerbestand:     original.lagerbestand,
      featured:         false,
      verkauft:         false,
      aktiv:            false,                       // Kopie startet inaktiv
      b2c_mode:         original.b2c_mode,
      seo_titel:        original.seo_titel         ?? undefined,
      seo_beschreibung: original.seo_beschreibung  ?? undefined,
      tags:             original.tags,
      hauptbild_url:    original.hauptbild_url     ?? undefined,
      rueckbild_url:    original.rueckbild_url     ?? undefined,
      video_url:        original.video_url         ?? undefined,
      abmessungen:      original.abmessungen       ?? undefined,
    },
    session.user.id
  );

  redirect(`/admin/produkte/${kopie.id}`);
}
