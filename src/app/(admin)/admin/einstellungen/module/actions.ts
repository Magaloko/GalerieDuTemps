"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth/config";
import { setFeaturesBulk, ALL_FEATURE_KEYS, type FeatureKey } from "@/lib/db/feature-flags";

export type ToggleResult = { ok: true } | { ok: false; fehler: string };

/**
 * Bulk-Save aller Modul-Toggles aus dem Admin-Form.
 * Liest jeden Checkbox-Wert aus FormData (checked = "on", unchecked = nicht in FormData).
 */
export async function moduleSpeichernAction(
  _prev: ToggleResult | null,
  formData: FormData,
): Promise<ToggleResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, fehler: "Нет прав" };

  // Aus FormData für jeden Key extrahieren — wenn nicht da → false (unchecked)
  const updates: Partial<Record<FeatureKey, boolean>> = {};
  for (const key of ALL_FEATURE_KEYS) {
    updates[key] = formData.get(key) === "on";
  }

  try {
    await setFeaturesBulk(updates, session.user.email ?? undefined);
    // Cache der Public-Pages invalidieren (Module könnten direkt sichtbar werden)
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, fehler: err instanceof Error ? err.message : "Ошибка сохранения" };
  }
}
