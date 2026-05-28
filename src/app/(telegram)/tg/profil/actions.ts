"use server";

import { revalidatePath } from "next/cache";
import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { customerProfilAktualisieren } from "@/lib/db/customers";

/* ──────────────────────────────────────────────────────────────────────────
 * Kunden-Kontaktdaten im Mini-App-Profil speichern.
 *
 * Customer-scoped: schreibt NUR auf die eigene customers-Row (subjectId aus
 * der signierten WebApp-Session). E-Mail bleibt bewusst aussen vor — die ist
 * Login-Identität und wird auf der Website mit Bestätigung geändert.
 * ────────────────────────────────────────────────────────────────────────── */

export type KontaktRes = { ok: true } | { ok: false; error: string };

const KANAELE = new Set(["telegram", "telefon", "whatsapp", "email"]);

/** Trim + Längen-Cap; leerer String → null (Feld leeren erlaubt). */
function clean(v: string | null | undefined, max = 50): string | null {
  if (v == null) return null;
  const t = v.trim().slice(0, max);
  return t.length ? t : null;
}

export async function kontaktdatenSpeichernAction(input: {
  telefon?:          string | null;
  whatsapp?:         string | null;
  telegram_username?: string | null;
  kontakt_kanal?:    string | null;
}): Promise<KontaktRes> {
  const s = await getWebAppSession();
  if (!s || s.role !== "customer" || !s.subjectId) {
    return { ok: false, error: "Профиль не привязан" };
  }

  const kanalRoh = clean(input.kontakt_kanal, 20);
  const kanal    = kanalRoh && KANAELE.has(kanalRoh) ? kanalRoh : null;
  // Telegram-Handle ohne führendes @ speichern (konsistent mit Link-Flow).
  const tgUser   = clean(input.telegram_username, 64)?.replace(/^@+/, "") ?? null;

  try {
    await customerProfilAktualisieren(s.subjectId, {
      telefon:           clean(input.telefon),
      whatsapp:          clean(input.whatsapp),
      telegram_username: tgUser,
      kontakt_kanal:     kanal,
    });
    revalidatePath("/tg/profil");
    return { ok: true };
  } catch (err) {
    console.error("[kontaktdatenSpeichern]", err);
    return { ok: false, error: "Ошибка сохранения" };
  }
}
