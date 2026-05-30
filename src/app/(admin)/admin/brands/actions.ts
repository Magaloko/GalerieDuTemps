"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/config";
import { getModuleBase } from "@/lib/module-base-server";
import {
  brandErstellen,
  brandAktualisieren,
  brandLoeschen,
  brandById,
} from "@/lib/db/brands";
import { storyBildUploadAction } from "@/app/(admin)/admin/produkte/actions";
import type { LandingBlock } from "@/types/landing";
import type { BrandVideo } from "@/types/brand";

// Bild-Upload für Logo/Cover/Intro-Blöcke: die bestehende Story-Upload-Action
// wiederverwenden (gleiche Bild-Pipeline + Admin-Guard). In einer "use server"-
// Datei dürfen nur async Funktionen exportiert werden → dünner Wrapper.
export async function brandBildUploadAction(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  return storyBildUploadAction(formData);
}

async function guard(): Promise<void> {
  const session = await requireAdminSession();
  if (!session) throw new Error("Нет прав");
}

/** Neue Marke anlegen (Form-Action) → direkt in den Editor. */
export async function brandErstellenAction(
  _prev: { fehler?: string } | null,
  formData: FormData,
): Promise<{ fehler?: string }> {
  await guard();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  if (name.length < 2) return { fehler: "Укажите название" };

  const brand = await brandErstellen({ name, slug });
  revalidatePath("/admin/brands");
  const base = await getModuleBase();
  redirect(`${base}/brands/${brand.id}`);
}

/** Inhalt + Meta speichern. */
export async function brandSpeichernAction(
  id: string,
  data: {
    name?: string;
    slug?: string;
    logo_url?: string | null;
    cover_url?: string | null;
    beschreibung?: Record<string, string>;
    videos?: BrandVideo[];
    intro_blocks?: LandingBlock[];
    aktiv?: boolean;
    sortierung?: number;
    seo_titel?: string | null;
    seo_beschreibung?: string | null;
  },
): Promise<{ ok: boolean }> {
  await guard();
  await brandAktualisieren(id, data);

  const brand = await brandById(id);
  revalidatePath("/admin/brands");
  revalidatePath(`/admin/brands/${id}`);
  if (brand) revalidatePath(`/brand/${brand.slug}`);
  return { ok: true };
}

/** Marke löschen. */
export async function brandLoeschenAction(id: string): Promise<{ ok: boolean }> {
  await guard();
  const brand = await brandById(id);
  await brandLoeschen(id);
  revalidatePath("/admin/brands");
  if (brand) revalidatePath(`/brand/${brand.slug}`);
  return { ok: true };
}
