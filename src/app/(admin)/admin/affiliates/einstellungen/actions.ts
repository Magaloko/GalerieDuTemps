"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import { einstellungAktualisieren } from "@/lib/db/affiliate-settings";
import type { AffiliateEinstellungen } from "@/types/affiliate";

export async function einstellungenSpeichernAction(
  _prev: { ok?: boolean; fehler?: string } | null,
  formData: FormData
): Promise<{ ok?: boolean; fehler?: string }> {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
    return { fehler: "Нет прав" };
  }

  const updates: Array<[keyof AffiliateEinstellungen, string | number | boolean]> = [
    ["provision_ebene_1_prozent", parseFloat(String(formData.get("provision_ebene_1_prozent") ?? "10"))],
    ["provision_ebene_2_prozent", parseFloat(String(formData.get("provision_ebene_2_prozent") ?? "3"))],
    ["provision_ebene_3_prozent", parseFloat(String(formData.get("provision_ebene_3_prozent") ?? "0"))],
    ["cookie_ttl_tage",           parseInt(String(formData.get("cookie_ttl_tage") ?? "30"))],
    ["mindestauszahlung_cent",    Math.round(parseFloat(String(formData.get("mindestauszahlung_eur") ?? "20")) * 100)],
    ["widerrufs_frist_tage",      parseInt(String(formData.get("widerrufs_frist_tage") ?? "14"))],
    ["registrierung_offen",       formData.get("registrierung_offen") === "on"],
  ];

  try {
    for (const [key, value] of updates) {
      await einstellungAktualisieren(key, value);
    }
    revalidatePath("/admin/affiliates/einstellungen");
    return { ok: true };
  } catch (err) {
    console.error("[Einstellungen]", err);
    return { fehler: "Не удалось сохранить" };
  }
}
