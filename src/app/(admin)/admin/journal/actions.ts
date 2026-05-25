"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { postErstellen, postAktualisieren, postLoeschen } from "@/lib/db/journal";

async function adminCheck() {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
    throw new Error("Nicht berechtigt");
  }
  return session.user;
}

export async function postCreateAction(
  _prev: { ok?: boolean; fehler?: string } | null,
  formData: FormData
): Promise<{ ok?: boolean; fehler?: string }> {
  const user = await adminCheck();
  const titel = String(formData.get("titel") ?? "").trim();
  if (titel.length < 2) return { fehler: "Titel erforderlich" };

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
  tags?:            string[];
  seo_titel?:       string;
  seo_beschreibung?: string;
  veroeffentlicht?: boolean;
}): Promise<{ ok?: boolean }> {
  await adminCheck();
  await postAktualisieren(id, data);
  revalidatePath(`/admin/journal/${id}/edit`);
  return { ok: true };
}

export async function postDeleteAction(id: string): Promise<void> {
  await adminCheck();
  await postLoeschen(id);
  revalidatePath("/admin/journal");
}
