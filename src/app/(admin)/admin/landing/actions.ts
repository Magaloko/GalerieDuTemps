"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getModuleBase } from "@/lib/module-base-server";
import { requireAdminSession } from "@/lib/auth/config";
import {
  landingPageErstellen,
  landingPageAktualisieren,
  landingPageLoeschen,
  landingPageAlsStartseite,
  landingPageById,
} from "@/lib/db/landing-pages";
import { storyBildUploadAction } from "@/app/(admin)/admin/produkte/actions";
import type { LandingBlock, LandingStatus } from "@/types/landing";

// Bild-Upload für Landing-Blöcke: die bestehende Story-Upload-Action
// wiederverwenden (gleiche Bild-Pipeline, gleicher Admin-Guard).
// In einer "use server"-Datei dürfen nur async Funktionen exportiert werden —
// daher als dünner Wrapper statt Re-Export.
export async function landingBildUploadAction(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  return storyBildUploadAction(formData);
}

async function guard(): Promise<void> {
  const session = await requireAdminSession();
  if (!session) throw new Error("Нет прав");
}

/** Neue Landing-Page anlegen (Form-Action) → direkt in den Editor. */
export async function landingErstellenAction(
  _prev: { fehler?: string } | null,
  formData: FormData,
): Promise<{ fehler?: string }> {
  await guard();
  const titel = String(formData.get("titel") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  if (titel.length < 2) return { fehler: "Укажите название" };

  const page = await landingPageErstellen({ titel, slug });
  revalidatePath("/admin/landing");
  const base = await getModuleBase();
  redirect(`${base}/landing/${page.id}`);
}

/** Inhalt + Meta speichern. */
export async function landingSpeichernAction(
  id: string,
  data: {
    titel?: string;
    slug?: string;
    blocks?: LandingBlock[];
    seo_titel?: string | null;
    seo_beschreibung?: string | null;
    brand_id?: string | null;
  },
): Promise<{ ok: boolean }> {
  await guard();
  await landingPageAktualisieren(id, data);

  const page = await landingPageById(id);
  revalidatePath("/admin/landing");
  revalidatePath(`/admin/landing/${id}`);
  if (page) {
    revalidatePath(`/lp/${page.slug}`);
    if (page.ist_startseite) revalidatePath("/");
  }
  return { ok: true };
}

/** Status setzen (entwurf / veroeffentlicht / archiviert). */
export async function landingStatusAction(
  id: string,
  status: LandingStatus,
): Promise<{ ok: boolean }> {
  await guard();
  await landingPageAktualisieren(id, { status });

  const page = await landingPageById(id);
  revalidatePath("/admin/landing");
  revalidatePath(`/admin/landing/${id}`);
  if (page) {
    revalidatePath(`/lp/${page.slug}`);
    if (page.ist_startseite) revalidatePath("/");
  }
  return { ok: true };
}

/** Als Startseite setzen (true) oder lösen (false → keine Startseite). */
export async function landingAlsStartseiteAction(
  id: string,
  an: boolean,
): Promise<{ ok: boolean }> {
  await guard();
  await landingPageAlsStartseite(an ? id : null);
  revalidatePath("/admin/landing");
  revalidatePath(`/admin/landing/${id}`);
  revalidatePath("/");
  return { ok: true };
}

/** Landing-Page löschen. */
export async function landingLoeschenAction(id: string): Promise<{ ok: boolean }> {
  await guard();
  const page = await landingPageById(id);
  await landingPageLoeschen(id);
  revalidatePath("/admin/landing");
  if (page?.ist_startseite) revalidatePath("/");
  return { ok: true };
}
