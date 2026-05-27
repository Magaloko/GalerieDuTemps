import { randomBytes } from "node:crypto";
import { getRedis } from "./index";

/**
 * Guest-Session-Store via Redis.
 *
 * Use-Cases:
 *   - Warenkorb persistent über Devices (anonymer Nutzer in mehreren Browsern)
 *   - Quiz-Antworten zwischenspeichern (bevor Lead-Conversion)
 *   - Telegram-Mini-App-State
 *
 * Pattern:
 *   1. Beim ersten Page-Load: generiere Guest-ID, setze in Cookie (HTTP-only)
 *   2. Lese/Schreibe Session-Daten via guestId in Redis
 *   3. TTL standard 30 Tage — verlängert sich bei jedem Zugriff (touch)
 *
 * Bei NextAuth-Login kannst du die Guest-Session in eine User-Session
 * mergen via `mergeGuestIntoUser(guestId, userId)`.
 */

const KEY_PREFIX = "gdt:guest:";
const DEFAULT_TTL_DAYS = 30;
const DEFAULT_TTL = DEFAULT_TTL_DAYS * 24 * 60 * 60; // 30 Tage in Sekunden

export function newGuestId(): string {
  // 24-byte = 32-char base64url, kollisionssicher
  return randomBytes(24).toString("base64url");
}

export async function sessionGet<T>(guestId: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    const raw = await r.get(KEY_PREFIX + guestId);
    if (raw === null) return null;
    // Touch: TTL refreshen bei jedem Read (rolling expiry)
    await r.expire(KEY_PREFIX + guestId, DEFAULT_TTL);
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn("[session] get failed:", err);
    return null;
  }
}

export async function sessionSet<T>(guestId: string, data: T, ttlSeconds = DEFAULT_TTL): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(KEY_PREFIX + guestId, JSON.stringify(data), "EX", ttlSeconds);
  } catch (err) {
    console.warn("[session] set failed:", err);
  }
}

export async function sessionDel(guestId: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.del(KEY_PREFIX + guestId);
  } catch (err) {
    console.warn("[session] del failed:", err);
  }
}

/**
 * Partial-Update: holt die existierende Session, mergt mit `patch`, schreibt zurück.
 * Wenn Session noch nicht existiert, wird sie mit `patch` als Startwert angelegt.
 */
export async function sessionUpdate<T extends Record<string, unknown>>(
  guestId: string,
  patch:   Partial<T>,
): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  const current = await sessionGet<T>(guestId) ?? ({} as T);
  const merged  = { ...current, ...patch };
  await sessionSet(guestId, merged);
  return merged;
}
