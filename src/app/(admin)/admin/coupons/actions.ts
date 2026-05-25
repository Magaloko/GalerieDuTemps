"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import { couponErstellen, couponLoeschen, couponToggleAktiv } from "@/lib/db/coupons";
import { z } from "zod";

const CouponSchema = z.object({
  code:                 z.string().min(2).max(50),
  beschreibung:         z.string().max(200).optional(),
  typ:                  z.enum(["prozent", "fest"]),
  wert:                 z.coerce.number().positive(),
  min_bestellwert_eur:  z.coerce.number().min(0).default(0),
  nutzungen_max:        z.coerce.number().int().min(0).optional(),
  nutzungen_pro_user:   z.coerce.number().int().min(1).default(1),
  gueltig_bis:          z.string().optional(),
  nur_b2b:              z.coerce.boolean().default(false),
  nur_b2c:              z.coerce.boolean().default(false),
});

export async function couponErstellenAction(
  _prev: { ok?: boolean; fehler?: string } | null,
  formData: FormData
): Promise<{ ok?: boolean; fehler?: string }> {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
    return { fehler: "Nicht berechtigt" };
  }
  const parsed = CouponSchema.safeParse({
    code:                formData.get("code"),
    beschreibung:        formData.get("beschreibung"),
    typ:                 formData.get("typ"),
    wert:                formData.get("wert"),
    min_bestellwert_eur: formData.get("min_bestellwert_eur"),
    nutzungen_max:       formData.get("nutzungen_max") || undefined,
    nutzungen_pro_user:  formData.get("nutzungen_pro_user"),
    gueltig_bis:         formData.get("gueltig_bis") || undefined,
    nur_b2b:             formData.get("nur_b2b") === "on",
    nur_b2c:             formData.get("nur_b2c") === "on",
  });
  if (!parsed.success) {
    return { fehler: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }

  try {
    await couponErstellen({
      code: parsed.data.code,
      beschreibung: parsed.data.beschreibung,
      typ: parsed.data.typ,
      wert: parsed.data.wert,
      min_bestellwert_cent: Math.round(parsed.data.min_bestellwert_eur * 100),
      nutzungen_max: parsed.data.nutzungen_max ?? null,
      nutzungen_pro_user: parsed.data.nutzungen_pro_user,
      gueltig_bis: parsed.data.gueltig_bis ?? null,
      nur_b2b: parsed.data.nur_b2b,
      nur_b2c: parsed.data.nur_b2c,
    });
    revalidatePath("/admin/coupons");
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message.includes("duplicate")) {
      return { fehler: "Code existiert bereits" };
    }
    console.error("[Coupon]", err);
    return { fehler: "Fehler beim Erstellen" };
  }
}

export async function couponLoeschenAction(id: string): Promise<void> {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) return;
  await couponLoeschen(id);
  revalidatePath("/admin/coupons");
}

export async function couponToggleAction(id: string, aktiv: boolean): Promise<void> {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) return;
  await couponToggleAktiv(id, aktiv);
  revalidatePath("/admin/coupons");
}
