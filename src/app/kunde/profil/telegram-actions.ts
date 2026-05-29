"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import {
  customerTelegramTokenGenerieren,
  customerTelegramLoesen,
  customerTelegramNotificationsToggle,
} from "@/lib/db/customer-telegram";

type TokenResult  = { ok: true; token: string } | { ok: false; error: string };
type SimpleResult = { ok: true } | { ok: false; error: string };

/* ──────────────────────────────────────────────────────────────────────────
 * Server-Actions für die Telegram-Sektion in /kunde/profil.
 *
 * Sicherheit: jede Action prüft session.user.role === "customer" UND dass
 * die customerId zur eigenen Session passt — sonst könnte ein angemeldeter
 * Customer A einen Token für Customer B erzeugen.
 * ────────────────────────────────────────────────────────────────────────── */

async function ensureOwn(customerId: string): Promise<{ ok: false; error: string } | null> {
  const session = await auth();
  if (session?.user?.role !== "customer") {
    return { ok: false, error: "Не авторизовано." };
  }
  if (session.user.id !== customerId) {
    return { ok: false, error: "Неверный аккаунт." };
  }
  return null;
}

export async function telegramTokenGenerierenAction(customerId: string): Promise<TokenResult> {
  const guard = await ensureOwn(customerId);
  if (guard) return guard;
  try {
    const token = await customerTelegramTokenGenerieren(customerId);
    return { ok: true, token };
  } catch (err) {
    console.error("[telegramTokenGenerieren]", err);
    return { ok: false, error: "Не удалось сгенерировать токен." };
  }
}

export async function telegramEntfernenAction(customerId: string): Promise<SimpleResult> {
  const guard = await ensureOwn(customerId);
  if (guard) return guard;
  try {
    await customerTelegramLoesen(customerId);
    revalidatePath("/kunde/profil");
    return { ok: true };
  } catch (err) {
    console.error("[telegramEntfernen]", err);
    return { ok: false, error: "Не удалось отвязать." };
  }
}

export async function telegramNotificationsToggleAction(
  customerId: string,
  aktiv: boolean,
): Promise<SimpleResult> {
  const guard = await ensureOwn(customerId);
  if (guard) return guard;
  try {
    await customerTelegramNotificationsToggle(customerId, aktiv);
    revalidatePath("/kunde/profil");
    return { ok: true };
  } catch (err) {
    console.error("[telegramNotificationsToggle]", err);
    return { ok: false, error: "Не удалось переключить." };
  }
}
