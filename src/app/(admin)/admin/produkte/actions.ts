"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth, requireAdminSession } from "@/lib/auth/config";
import { produktErstellen, produktAktualisieren, produktLoeschen, produktById, produktReservieren, produktReservierungAufheben, produktEntwurfErstellen, entwuerfeListe } from "@/lib/db/produkte";
import { ProduktCreateSchema } from "@/lib/utils/validierung";
import { auditLog } from "@/lib/db/audit-log";
import type { Currency } from "@/lib/utils/preis";

export type FormState = {
  errors?:  Record<string, string[]>;
  message?: string;
  /** ISO-Zeitstempel der erfolgreichen Speicherung (für Sticky-Save-Bar) */
  savedAt?: string;
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
    inhalt_blocks:    (() => {
      const raw = formData.get("inhalt_blocks");
      if (typeof raw !== "string" || !raw.trim()) return [];
      try { const a = JSON.parse(raw); return Array.isArray(a) ? a : []; }
      catch { return []; }
    })(),
    abmessungen,
  };
}

// ---------------------------------------------------------------------------
// Story-Bild-Upload: Datei → verarbeitet → URL (ohne Galerie-Insert).
// Für Inline-Bilder in der Block-Story.
// ---------------------------------------------------------------------------
export async function storyBildUploadAction(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Нет файла" };
  try {
    const { bildVerarbeiten } = await import("@/lib/storage/upload");
    const bild = await bildVerarbeiten(file);
    return { ok: true, url: bild.url };
  } catch (err) {
    console.error("[storyBildUpload]", err);
    return { ok: false, error: err instanceof Error ? err.message : "Ошибка загрузки" };
  }
}

// ---------------------------------------------------------------------------
// Foto-first-Anlegen: Draft erzeugen und direkt in den Editor springen
// ---------------------------------------------------------------------------
export async function produktEntwurfStartenAction(): Promise<void> {
  const session = await requireAdminSession();
  if (!session) throw new Error("Нет прав");
  const id = await produktEntwurfErstellen();
  redirect(`/admin/produkte/${id}?neu=1`);
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
  // ?created=1 → Edit-Page zeigt 1x „Создано"-Toast.
  redirect(`/admin/produkte/${produkt.id}?created=1`);
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
  return { message: "Сохранено", savedAt: new Date().toISOString() };
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
    // Auto-Broadcast beim Veröffentlichen (aktiv → true), best-effort/einmalig.
    if (feld === "aktiv" && value === true) {
      const { autoBroadcastBeiPublish } = await import("@/lib/telegram/neuheiten");
      await autoBroadcastBeiPublish(id);
    }
    revalidatePath("/admin/produkte");
    return { ok: true };
  } catch (err) {
    console.error("[quickToggle]", err);
    return { ok: false, error: "Aktualisierung fehlgeschlagen" };
  }
}

// ---------------------------------------------------------------------------
// Reservierung — manuell durch Kurator/Admin (48h Default)
// ---------------------------------------------------------------------------
export async function produktReservierenAction(
  id:      string,
  stunden = 48,
  fuer?:   string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };

  try {
    const ok = await produktReservieren(id, stunden, fuer ?? null);
    if (!ok) return { ok: false, error: "Товар уже продан или зарезервирован" };
    await auditLog({
      action:     "produkt_reserviert",
      actorEmail: session.user.email ?? null,
      entity:     id,
      neuWert:    { stunden, fuer: fuer ?? null },
    });
    revalidatePath("/admin/produkte");
    return { ok: true };
  } catch (err) {
    console.error("[reservieren]", err);
    return { ok: false, error: "Не удалось зарезервировать" };
  }
}

export async function produktReservierungAufhebenAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };

  try {
    await produktReservierungAufheben(id);
    await auditLog({
      action:     "produkt_reservierung_aufgehoben",
      actorEmail: session.user.email ?? null,
      entity:     id,
    });
    revalidatePath("/admin/produkte");
    return { ok: true };
  } catch (err) {
    console.error("[reservierung-aufheben]", err);
    return { ok: false, error: "Не удалось снять резерв" };
  }
}

// ---------------------------------------------------------------------------
// New-Arrivals-Broadcast — Produkt in den Telegram-Kanal posten
// ---------------------------------------------------------------------------
export async function produktInKanalAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };

  const produkt = await produktById(id);
  if (!produkt) return { ok: false, error: "Товар не найден" };

  const { broadcastProduktInKanal, markKanalGepostet } = await import("@/lib/telegram/neuheiten");
  const res = await broadcastProduktInKanal({
    slug:          produkt.slug,
    name:          produkt.name,
    preis:         produkt.preis,
    waehrung:      produkt.waehrung,
    hauptbild_url: produkt.hauptbild_url ?? produkt.bilder?.[0]?.url ?? null,
  });
  if (!res.ok) return { ok: false, error: res.error };

  await markKanalGepostet(id);
  await auditLog({
    action:     "produkt_broadcast_kanal",
    actorEmail: session.user.email ?? null,
    entity:     id,
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Kunden-Web-Push — Produkt als Neuheit an alle Push-Abonnenten (audience='customer')
// ---------------------------------------------------------------------------
export async function produktKundenPushAction(
  produktId: string,
): Promise<{ ok: true } | { error: string }> {
  const session = await requireAdminSession();
  if (!session) return { error: "Нет прав" };

  const produkt = await produktById(produktId);
  if (!produkt) return { error: "Товар не найден" };

  try {
    const { formatPreis } = await import("@/lib/utils/preis");
    const { notifyCustomersPush } = await import("@/lib/push/notify");
    await notifyCustomersPush(
      `Новинка: ${produkt.name}`,
      `${formatPreis(produkt.preis, produkt.waehrung as Currency)} · смотреть`,
      `/katalog/${produkt.slug}`,
    );
    await auditLog({
      action:     "produkt_kunden_push",
      actorEmail: session.user.email ?? null,
      entity:     produktId,
    });
    return { ok: true };
  } catch (err) {
    console.error("[produktKundenPush]", err);
    return { error: "Не удалось отправить уведомление" };
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
          case "aktivieren": {
            await produktAktualisieren(id, { aktiv: true });
            const { autoBroadcastBeiPublish } = await import("@/lib/telegram/neuheiten");
            await autoBroadcastBeiPublish(id);
            break;
          }
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
// Entwürfe-Review-Queue: Veröffentlichen / KI-Ausfüllen / Löschen
// ---------------------------------------------------------------------------
export async function entwurfVeroeffentlichenAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };
  const p = await produktById(id);
  if (!p) return { ok: false, error: "Не найдено" };
  if (!(p.preis > 0)) return { ok: false, error: "Укажите цену перед публикацией" };
  try {
    await produktAktualisieren(id, { aktiv: true, b2c_mode: "visible" });
    const { autoBroadcastBeiPublish } = await import("@/lib/telegram/neuheiten");
    await autoBroadcastBeiPublish(id);
    revalidatePath("/admin/produkte/entwuerfe");
    revalidatePath("/admin/produkte");
    return { ok: true };
  } catch (err) {
    console.error("[entwurfVeroeffentlichen]", err);
    return { ok: false, error: "Не удалось опубликовать" };
  }
}

export async function entwurfKiFuellenAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };
  const p = await produktById(id);
  if (!p) return { ok: false, error: "Не найдено" };

  const notizen = [p.name, p.beschreibung ?? ""].join("\n").trim();
  try {
    const { extrahiereProduktDaten, ExtraktorError } = await import("@/lib/ai/produkt-extraktor");
    let daten;
    try {
      daten = await extrahiereProduktDaten(notizen, { kategorieHint: p.kategorie_name ?? undefined });
    } catch (err) {
      if (err instanceof ExtraktorError) return { ok: false, error: err.message };
      throw err;
    }
    await produktAktualisieren(id, {
      name:             daten.name,
      kurzbeschreibung: daten.kurzbeschreibung,
      beschreibung:     daten.beschreibung,
      era:              daten.era ?? undefined,
      herkunft:         daten.herkunft ?? undefined,
      material:         daten.material ?? undefined,
      zustand:          daten.zustand,
      tags:             daten.tags,
      seo_titel:        daten.seo_titel,
      seo_beschreibung: daten.seo_beschreibung,
    });
    revalidatePath("/admin/produkte/entwuerfe");
    return { ok: true };
  } catch (err) {
    console.error("[entwurfKiFuellen]", err);
    return { ok: false, error: err instanceof Error ? err.message : "Ошибка ИИ" };
  }
}

export async function entwurfFeldAction(
  id: string,
  felder: { preis?: number; kategorie_id?: number | null; zustand?: string },
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };
  try {
    const upd: { preis?: number; kategorie_id?: number | null; zustand?: "sehr_gut" | "gut" | "akzeptabel" | "restauriert" } = {};
    if (typeof felder.preis === "number" && felder.preis > 0) upd.preis = felder.preis;
    if (felder.kategorie_id !== undefined) upd.kategorie_id = felder.kategorie_id;
    if (felder.zustand && ["sehr_gut", "gut", "akzeptabel", "restauriert"].includes(felder.zustand)) {
      upd.zustand = felder.zustand as "sehr_gut" | "gut" | "akzeptabel" | "restauriert";
    }
    if (Object.keys(upd).length === 0) return { ok: false, error: "Нечего сохранять" };
    await produktAktualisieren(id, upd);
    revalidatePath("/admin/produkte/entwuerfe");
    return { ok: true };
  } catch (err) {
    console.error("[entwurfFeld]", err);
    return { ok: false, error: "Ошибка сохранения" };
  }
}

export async function entwurfLoeschenAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };
  try {
    await produktLoeschen(id);
    revalidatePath("/admin/produkte/entwuerfe");
    return { ok: true };
  } catch (err) {
    console.error("[entwurfLoeschen]", err);
    return { ok: false, error: "Ошибка удаления" };
  }
}

/**
 * Stapel-Veröffentlichen: alle Drafts mit echter Preisangabe (> 1 = kein
 * Platzhalter) live schalten. Schnell (kein KI) → in einer Action sicher.
 */
export async function entwuerfeBatchVeroeffentlichenAction(): Promise<{
  ok: boolean; veroeffentlicht: number; uebersprungen: number; error?: string;
}> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, veroeffentlicht: 0, uebersprungen: 0, error: "Нет прав" };
  try {
    const drafts = await entwuerfeListe(200);
    const { autoBroadcastBeiPublish } = await import("@/lib/telegram/neuheiten");
    let pub = 0, skip = 0;
    for (const d of drafts) {
      if (!(Number(d.preis) > 1)) { skip++; continue; }   // Platzhalter (1) überspringen
      await produktAktualisieren(d.id, { aktiv: true, b2c_mode: "visible" });
      await autoBroadcastBeiPublish(d.id);
      pub++;
    }
    revalidatePath("/admin/produkte/entwuerfe");
    revalidatePath("/admin/produkte");
    return { ok: true, veroeffentlicht: pub, uebersprungen: skip };
  } catch (err) {
    console.error("[entwuerfeBatchVeroeffentlichen]", err);
    return { ok: false, veroeffentlicht: 0, uebersprungen: 0, error: "Ошибка" };
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
