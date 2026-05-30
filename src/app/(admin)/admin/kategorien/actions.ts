"use server";

import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/config";
import { getModuleBase } from "@/lib/module-base-server";
import {
  kategorieErstellen,
  kategorieAktualisieren,
  kategorieLoeschen,
  kategorienStrukturSpeichern,
} from "@/lib/db/kategorien";
import { KategorieCreateSchema } from "@/lib/utils/validierung";

export type FormState = {
  errors?: Record<string, string[]>;
  message?: string;
} | null;

function parseFormData(formData: FormData) {
  return {
    name:         formData.get("name"),
    slug:         formData.get("slug")         || undefined,
    code:         formData.get("code")         || undefined,
    beschreibung: formData.get("beschreibung") || undefined,
    eltern_id:    formData.get("eltern_id")    || undefined,
    bild_url:     formData.get("bild_url")     || undefined,
    sortierung:   formData.get("sortierung"),
    aktiv:        formData.get("aktiv")        !== "false",
  };
}

export async function kategorieErstellenAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdminSession();
  if (!session) return { message: "Не авторизовано" };

  const parsed = KategorieCreateSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const kat = await kategorieErstellen(parsed.data);
  const base = await getModuleBase();
  redirect(`${base}/kategorien/${kat.id}`);
}

export async function kategorieAktualisierenAction(
  id: number,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdminSession();
  if (!session) return { message: "Не авторизовано" };

  const parsed = KategorieCreateSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  await kategorieAktualisieren(id, parsed.data);
  return { message: "Категория сохранена." };
}

/**
 * Struktur speichern (Reihenfolge + Gruppierung + Aktiv) aus der sortierbaren
 * Verwaltungs-Liste. Batch/atomar.
 */
export async function kategorienStrukturAction(
  items: { id: number; sortierung: number; eltern_id: number | null; aktiv: boolean }[]
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Не авторизовано" };
  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: "Нет данных" };

  const clean = items
    .filter(i => Number.isInteger(i.id))
    .map(i => ({
      id:         i.id,
      sortierung: Number.isFinite(i.sortierung) ? Math.trunc(i.sortierung) : 0,
      eltern_id:  i.eltern_id == null ? null : Number(i.eltern_id),
      aktiv:      !!i.aktiv,
    }));

  try {
    await kategorienStrukturSpeichern(clean);
    return { ok: true };
  } catch (err) {
    console.error("[kategorienStruktur]", err);
    return { ok: false, error: "Не удалось сохранить структуру" };
  }
}

export async function kategorieLoeschenAction(id: number): Promise<void> {
  const session = await requireAdminSession();
  if (!session) throw new Error("Не авторизовано");
  await kategorieLoeschen(id);
  const base = await getModuleBase();
  redirect(`${base}/kategorien`);
}
