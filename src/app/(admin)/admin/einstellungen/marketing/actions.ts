"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import { upsertMarketingString, type MarketingI18n } from "@/lib/db/marketing-strings";

export type SaveResult = { ok: true } | { ok: false; error: string };

/* ──────────────────────────────────────────────────────────────────────────
 * saveMarketingStringAction
 *
 * Speichert die i18n-Werte für einen Marketing-String. Nur admin/superadmin.
 * Revalidiert die Pages die diese Strings nutzen (Startseite + alle
 * Public-Pages die den Header-Promo zeigen).
 * ────────────────────────────────────────────────────────────────────────── */
export async function saveMarketingStringAction(
  _prev: SaveResult | null,
  formData: FormData,
): Promise<SaveResult> {
  const session = await auth();
  const role    = session?.user?.role;
  if (role !== "admin" && role !== "superadmin") {
    return { ok: false, error: "Nicht autorisiert." };
  }

  const schluessel = (formData.get("schluessel") as string | null)?.trim();
  if (!schluessel) {
    return { ok: false, error: "Schlüssel fehlt." };
  }

  const patch: MarketingI18n = {};
  for (const lang of ["ru", "en", "de", "kz"] as const) {
    const val = formData.get(`wert_${lang}`);
    if (typeof val === "string") {
      patch[lang] = val;
    }
  }

  try {
    await upsertMarketingString(schluessel, patch);
  } catch (err) {
    console.error("[saveMarketingString]", err);
    return { ok: false, error: err instanceof Error ? err.message : "Speichern fehlgeschlagen" };
  }

  // Pages mit Marketing-Strings revalidieren — kein Warten auf 60s-Cache.
  revalidatePath("/", "layout");
  revalidatePath("/admin/einstellungen/marketing");

  return { ok: true };
}
