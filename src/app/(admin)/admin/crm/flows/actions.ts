"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import { dripFlowErstellen, dripFlowToggleAktiv, dripFlowLoeschen } from "@/lib/db/crm";
import type { DripTriggerTyp } from "@/types/crm";

export async function flowCreateAction(
  _prev: { ok?: boolean; fehler?: string } | null,
  formData: FormData
): Promise<{ ok?: boolean; fehler?: string }> {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
    return { fehler: "Нет прав" };
  }
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { fehler: "Укажите название" };

  await dripFlowErstellen({
    name,
    beschreibung:  String(formData.get("beschreibung") ?? "") || undefined,
    trigger_typ:   (formData.get("trigger_typ") as DripTriggerTyp) ?? "manual",
    trigger_param: String(formData.get("trigger_param") ?? "") || undefined,
  });
  revalidatePath("/admin/crm/flows");
  return { ok: true };
}

export async function flowToggleAction(id: string, aktiv: boolean): Promise<void> {
  await auth();
  await dripFlowToggleAktiv(id, aktiv);
  revalidatePath("/admin/crm/flows");
}

export async function flowDeleteAction(id: string): Promise<void> {
  await auth();
  await dripFlowLoeschen(id);
  revalidatePath("/admin/crm/flows");
}
