"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { postErstellen, postAktualisieren, postLoeschen, postById } from "@/lib/db/journal";
import { storyBildUploadAction } from "@/app/(admin)/admin/produkte/actions";
import type { LandingBlock } from "@/types/landing";

async function adminCheck() {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
    throw new Error("Нет прав");
  }
  return session.user;
}

// Bild-Upload für Journal-Blöcke: dieselbe Bild-Pipeline + Admin-Guard wie
// Produkt-Story / Landing-Blöcke wiederverwenden (dünner Wrapper, da in einer
// "use server"-Datei nur async Funktionen exportiert werden dürfen).
export async function journalBildUploadAction(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  return storyBildUploadAction(formData);
}

export async function postCreateAction(
  _prev: { ok?: boolean; fehler?: string } | null,
  formData: FormData
): Promise<{ ok?: boolean; fehler?: string }> {
  const user = await adminCheck();
  const titel = String(formData.get("titel") ?? "").trim();
  if (titel.length < 2) return { fehler: "Укажите заголовок" };

  const p = await postErstellen({
    titel,
    autor_id:   user.id,
    autor_name: user.name ?? undefined,
  });
  redirect(`/admin/journal/${p.id}/edit`);
}

export async function postUpdateAction(id: string, data: {
  titel?:           string;
  excerpt?:         string;
  cover_bild_url?:  string;
  markdown?:        string;
  blocks?:          LandingBlock[];
  tags?:            string[];
  brand_id?:        string | null;
  seo_titel?:       string;
  seo_beschreibung?: string;
  veroeffentlicht?: boolean;
}): Promise<{ ok?: boolean }> {
  await adminCheck();
  await postAktualisieren(id, data);
  revalidatePath(`/admin/journal/${id}/edit`);
  revalidatePath("/journal");
  const p = await postById(id).catch(() => null);
  if (p) revalidatePath(`/journal/${p.slug}`);
  return { ok: true };
}

export async function postDeleteAction(id: string): Promise<void> {
  await adminCheck();
  await postLoeschen(id);
  revalidatePath("/admin/journal");
}
