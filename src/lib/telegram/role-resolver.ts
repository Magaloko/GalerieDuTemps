import { query } from "@/lib/db";
import { customerByTelegramChatId } from "@/lib/db/customer-telegram";
import type { Customer } from "@/types/commerce";

/* ──────────────────────────────────────────────────────────────────────────
 * Telegram-Role-Resolver
 *
 * Eine Telegram-chat_id kann zu einem von drei „Rollen-Profilen" gehören:
 *
 *   1. admin   — Eintrag in sebo.benutzer mit rolle IN ('admin','superadmin')
 *                und telegram_chat_id = chatId
 *   2. customer — Eintrag in sebo.customers mit telegram_chat_id = chatId
 *   3. guest    — keine Verknüpfung in der DB
 *
 * Bei Konflikt (sowohl Admin als auch Customer mit gleicher chat_id):
 * Admin gewinnt — Mini-App rendert Admin-UI, Customer-Bestellungen sind
 * weiter via /admin/bestellungen sichtbar. Das verhindert dass ein Admin
 * der gleichzeitig Test-Bestellungen macht „nur Customer-Mode" sieht.
 *
 * Niemals throw — bei DB-Fehlern silent guest, damit /api/telegram/auth
 * nicht hängt sondern Mini-App im Read-only-Modus läuft.
 * ────────────────────────────────────────────────────────────────────────── */

export interface BenutzerForTelegram {
  id:       string;
  name:     string | null;
  email:    string;
  rolle:    "admin" | "superadmin";
  telegram_chat_id:    number | null;
  telegram_username:   string | null;
  telegram_notifications_aktiv: boolean;
}

export type TelegramRole = "admin" | "customer" | "guest";

export interface ResolvedTelegramIdentity {
  role:    TelegramRole;
  admin?:  BenutzerForTelegram;
  customer?: Customer;
}

/** Admin-Lookup per Telegram-chat_id. Null wenn nicht verknüpft. */
export async function benutzerByTelegramChatId(
  chatId: number,
): Promise<BenutzerForTelegram | null> {
  try {
    const r = await query<BenutzerForTelegram>(
      `SELECT id, name, email, rolle,
              telegram_chat_id, telegram_username, telegram_notifications_aktiv
       FROM sebo.benutzer
       WHERE telegram_chat_id = $1
         AND rolle IN ('admin', 'superadmin')
         AND aktiv = true
       LIMIT 1`,
      [chatId],
    );
    return r.rows[0] ?? null;
  } catch (err) {
    // Wenn Migration 037 noch nicht angewendet: „column telegram_chat_id
    // does not exist". Silent fallback auf guest.
    console.warn("[benutzerByTelegramChatId]", err);
    return null;
  }
}

/** Vollständiger Resolver: prüft Admin → Customer → Guest. */
export async function resolveTelegramIdentity(
  chatId: number,
): Promise<ResolvedTelegramIdentity> {
  const admin = await benutzerByTelegramChatId(chatId);
  if (admin) {
    return { role: "admin", admin };
  }
  const customer = await customerByTelegramChatId(chatId);
  if (customer) {
    return { role: "customer", customer };
  }
  return { role: "guest" };
}
