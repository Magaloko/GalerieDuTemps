"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth/config";
import { setKiApiKey } from "@/lib/db/ki-einstellungen";

/** DeepSeek-API-Key speichern (Admin-Menü). */
export async function kiKeySpeichernAction(
  key: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Не авторизовано" };

  const clean = (key ?? "").trim();
  if (clean.length < 10) {
    return { ok: false, error: "Ключ слишком короткий — проверьте значение." };
  }
  try {
    await setKiApiKey(clean, session.user.email ?? undefined);
    revalidatePath("/admin/einstellungen/ki");
    revalidatePath("/app/einstellungen/ki");
    return { ok: true };
  } catch (err) {
    console.error("[kiKeySpeichern]", err);
    return { ok: false, error: "Не удалось сохранить ключ." };
  }
}

/** Gespeicherten Key entfernen → fällt auf ENV-Fallback zurück (falls vorhanden). */
export async function kiKeyLoeschenAction(): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Не авторизовано" };
  try {
    await setKiApiKey(null, session.user.email ?? undefined);
    revalidatePath("/admin/einstellungen/ki");
    revalidatePath("/app/einstellungen/ki");
    return { ok: true };
  } catch (err) {
    console.error("[kiKeyLoeschen]", err);
    return { ok: false, error: "Не удалось удалить ключ." };
  }
}

/** Verbindungstest: minimaler DeepSeek-Call mit dem aktuell gültigen Key. */
export async function kiKeyTestenAction(): Promise<{ ok: boolean; message: string }> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, message: "Не авторизовано" };
  try {
    const { getDeepseekClient, DEEPSEEK_MODEL } = await import("@/lib/ai/deepseek-client");
    const client = await getDeepseekClient();
    await client.chat.completions.create({
      model:      DEEPSEEK_MODEL,
      messages:   [{ role: "user", content: "ping" }],
      max_tokens: 1,
    });
    return { ok: true, message: `✓ Соединение работает (модель: ${DEEPSEEK_MODEL})` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Ошибка соединения";
    return { ok: false, message: msg };
  }
}
