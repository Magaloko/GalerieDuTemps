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
function parseJsonField(v: FormDataEntryValue | null): Record<string,string> | undefined {
  if (!v) return undefined;
  try {
    const parsed = JSON.parse(String(v));
    if (typeof parsed === "object" && parsed !== null) {
      // nur string-Values behalten
      const out: Record<string,string> = {};
      for (const [k, val] of Object.entries(parsed)) {
        if (typeof val === "string" && val.trim().length > 0) out[k] = val;
      }
      return Object.keys(out).length > 0 ? out : undefined;
    }
  } catch { /* fall-through */ }
  return undefined;
}

function parseProduktFormData(formData: FormData) {
  const nameI18n   = parseJsonField(formData.get("name_i18n"));
  const kurzI18n   = parseJsonField(formData.get("kurzbeschreibung_i18n"));
  const beschrI18n = parseJsonField(formData.get("beschreibung_i18n"));

  // Default-Werte für name/kurz/beschr.
  // Reihenfolge: i18n.ru → i18n.en/de (erster gesetzter) → plain formData.
  // Wichtig: formData.get() liefert leeren String wenn das Feld da aber leer ist —
  // daher explizit auf .trim().length prüfen statt ?? (greift nur bei null).
  const pickI18n = (m?: Record<string,string>) =>
    m ? (m.ru?.trim() || m.en?.trim() || m.de?.trim() || "") : "";
  const pickPlain = (v: FormDataEntryValue | null) =>
    (typeof v === "string" ? v.trim() : "");

  const nameDefault   = pickI18n(nameI18n)   || pickPlain(formData.get("name"));
  const kurzDefault   = pickI18n(kurzI18n)   || pickPlain(formData.get("kurzbeschreibung"));
  const beschrDefault = pickI18n(beschrI18n) || pickPlain(formData.get("beschreibung"));

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
    name:             nameDefault,
    slug:             formData.get("slug")           || undefined,
    artikel_code:     formData.get("artikel_code")   || undefined,
    beschreibung:     beschrDefault,
    kurzbeschreibung: kurzDefault,
    name_i18n:             nameI18n,
    kurzbeschreibung_i18n: kurzI18n,
    beschreibung_i18n:     beschrI18n,
    preis:            formData.get("preis"),
    originalpreis:    formData.get("originalpreis")  || undefined,
    einkaufspreis:    formData.get("einkaufspreis")  || undefined,
    b2b_preis:        formData.get("b2b_preis")      || undefined,
    waehrung:         (formData.get("waehrung") as string | null) || undefined,
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
    // Instagram-URLs: kommen als mehrere Hidden-Inputs mit selbem name aus
    // InstagramUrlsInput. formData.getAll() liefert das Array.
    // Leere Strings ausfiltern (kommen vor wenn 0 URLs → ein leerer placeholder).
    instagram_urls:   formData.getAll("instagram_urls")
                        .map(v => typeof v === "string" ? v.trim() : "")
                        .filter(v => v.length > 0),
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
  // Direkt zur Edit-Page weiterleiten — dort ist die Bilder-Galerie inline
  // sichtbar, sodass der Admin nahtlos weitermachen kann (Bilder hochladen).
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
// Bulk-Aktionen — Liste von IDs gleichzeitig manipulieren
// ---------------------------------------------------------------------------
type BulkAction = "aktivieren" | "deaktivieren" | "featured_an" | "featured_aus" | "verkauft" | "loeschen";

export async function produktBulkAction(
  ids:    string[],
  action: BulkAction
): Promise<{ ok: boolean; count?: number; error?: string }> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };
  if (!Array.isArray(ids) || ids.length === 0) return { ok: false, error: "Keine Auswahl" };
  if (ids.length > 200) return { ok: false, error: "Max 200 pro Bulk" };

  const valid = ids.filter(id => /^[0-9a-f-]{36}$/i.test(id));
  if (valid.length === 0) return { ok: false, error: "Ungültige IDs" };

  try {
    let count = 0;
    for (const id of valid) {
      try {
        switch (action) {
          case "aktivieren":    await produktAktualisieren(id, { aktiv: true });    break;
          case "deaktivieren":  await produktAktualisieren(id, { aktiv: false });   break;
          case "featured_an":   await produktAktualisieren(id, { featured: true }); break;
          case "featured_aus":  await produktAktualisieren(id, { featured: false });break;
          case "verkauft":      await produktAktualisieren(id, { verkauft: true }); break;
          case "loeschen":      await produktLoeschen(id); break;
          default: return { ok: false, error: "Unbekannte Aktion" };
        }
        count++;
      } catch (err) {
        console.error("[bulk]", action, id, err);
      }
    }
    revalidatePath("/admin/produkte");
    return { ok: true, count };
  } catch (err) {
    console.error("[bulk]", err);
    return { ok: false, error: "Bulk-Operation fehlgeschlagen" };
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
