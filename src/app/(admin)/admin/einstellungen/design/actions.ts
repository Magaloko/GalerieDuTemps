"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import { setManyThemeSettings } from "@/lib/db/theme";

export type SaveResult = { ok: true } | { ok: false; error: string };

/* ──────────────────────────────────────────────────────────────────────────
 * saveThemeAction — bulk-update aller geänderten Theme-Werte.
 *
 * Body kommt als JSON-String (FormData lässt nur Strings zu, also serializen
 * wir das ganze Patch-Objekt in ein Hidden-Field).
 *
 * Nach Save: revalidate Root-Layout damit Iframe-Preview sofort neue Farben
 * sieht beim Reload.
 * ────────────────────────────────────────────────────────────────────────── */
export async function saveThemeAction(
  _prev: SaveResult | null,
  formData: FormData,
): Promise<SaveResult> {
  const session = await auth();
  const role    = session?.user?.role;
  if (role !== "admin" && role !== "superadmin") {
    return { ok: false, error: "Нет прав" };
  }

  const raw = formData.get("patch");
  if (typeof raw !== "string") return { ok: false, error: "Данные patch отсутствуют" };

  let patch: Record<string, string>;
  try {
    patch = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Некорректный JSON patch" };
  }
  if (typeof patch !== "object" || patch === null) {
    return { ok: false, error: "Patch должен быть объектом" };
  }

  // Whitelist: nur color.*, brand.* keys erlaubt — sonst könnte Admin
  // beliebige sebo.theme_settings-Zeilen ändern (z.B. fremde Spalten).
  const allowedPrefixes = ["color.", "brand."];
  for (const key of Object.keys(patch)) {
    if (!allowedPrefixes.some(p => key.startsWith(p))) {
      return { ok: false, error: `Ключ '${key}' не разрешён` };
    }
    // Farb-Werte: HEX-Format validieren
    if (key.startsWith("color.") && !/^#[0-9a-fA-F]{6}$/.test(patch[key])) {
      return { ok: false, error: `Некорректное значение цвета для '${key}': '${patch[key]}'` };
    }
  }

  try {
    await setManyThemeSettings(patch);
  } catch (err) {
    console.error("[saveTheme]", err);
    return { ok: false, error: err instanceof Error ? err.message : "Ошибка БД" };
  }

  // Layout-Cache invalidieren damit Iframe-Reload sofort die neuen Farben hat
  revalidatePath("/", "layout");
  revalidatePath("/admin/einstellungen/design");

  return { ok: true };
}
