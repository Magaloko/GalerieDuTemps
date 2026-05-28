"use server";

import { claimBestaetigen } from "@/lib/db/customer-telegram-claim";

export type ClaimActionResult =
  | { ok: true; customerId: string }
  | { ok: false; error: string };

/**
 * Bestätigt einen Telegram-Claim. Atomar — verschiebt claim-Felder in
 * die echten telegram_*-Felder.
 *
 * Aufgerufen aus dem ClaimForm-Component nach „Подтвердить"-Click.
 *
 * KEINE Auth nötig: Token in der URL ist der Trust-Anchor (nur der echte
 * Email-Owner hatte Zugang zur Inbox und konnte den Link öffnen). Das ist
 * äquivalent zu Password-Reset-Flows.
 */
export async function claimBestaetigenAction(token: string): Promise<ClaimActionResult> {
  if (!token || token.length < 16) {
    return { ok: false, error: "Токен отсутствует или некорректный." };
  }
  const customerId = await claimBestaetigen(token);
  if (!customerId) {
    return {
      ok: false,
      error: "Не удалось подтвердить — токен истёк или уже использован.",
    };
  }
  return { ok: true, customerId };
}
