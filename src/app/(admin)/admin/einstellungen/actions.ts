"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import { systemEinstellungenSpeichern } from "@/lib/db/system-einstellungen";
import type { SystemEinstellungen } from "@/types/affiliate";

export type EinstellungenState = { ok?: boolean; fehler?: string } | null;

export async function einstellungenSpeichernAction(
  _prev: EinstellungenState,
  formData: FormData
): Promise<EinstellungenState> {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
    return { fehler: "Nicht berechtigt" };
  }

  const patches: Partial<SystemEinstellungen> = {
    // Firma
    firma_name:           String(formData.get("firma_name")    ?? ""),
    firma_strasse:        String(formData.get("firma_strasse") ?? ""),
    firma_plz:            String(formData.get("firma_plz")     ?? ""),
    firma_ort:            String(formData.get("firma_ort")     ?? ""),
    firma_land:           String(formData.get("firma_land")    ?? "DE"),
    firma_email:          String(formData.get("firma_email")   ?? ""),
    firma_telefon:        String(formData.get("firma_telefon") ?? ""),
    firma_steuer_id:      String(formData.get("firma_steuer_id") ?? ""),
    firma_ust_id:         String(formData.get("firma_ust_id")    ?? ""),
    firma_handelsregister: String(formData.get("firma_handelsregister") ?? ""),
    // SEPA
    sepa_absender_iban:   String(formData.get("sepa_absender_iban") ?? "").replace(/\s/g, "").toUpperCase(),
    sepa_absender_bic:    String(formData.get("sepa_absender_bic")  ?? "").toUpperCase(),
    sepa_absender_name:   String(formData.get("sepa_absender_name") ?? ""),
    sepa_creditor_id:     String(formData.get("sepa_creditor_id")   ?? ""),
    // Stripe
    stripe_connect_enabled: formData.get("stripe_connect_enabled") === "on",
    stripe_publishable_key: String(formData.get("stripe_publishable_key") ?? ""),
    stripe_mode:           (formData.get("stripe_mode") === "live" ? "live" : "test"),
    // Cookies
    cookie_banner_aktiv:   formData.get("cookie_banner_aktiv") === "on",
  };

  try {
    await systemEinstellungenSpeichern(patches);
    revalidatePath("/admin/einstellungen");
    return { ok: true };
  } catch (err) {
    console.error("[Einstellungen]", err);
    return { fehler: "Speichern fehlgeschlagen" };
  }
}
