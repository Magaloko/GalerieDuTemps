import { cookies } from "next/headers";
import { createHash } from "crypto";

const COOKIE_NAME = "aff_ref";

export interface AffiliateCookieData {
  code:     string;
  klick_id: number | null;
  set_at:   number;     // Unix-ms
}

/** Cookie setzen (z.B. wenn ?ref=CODE erkannt) */
export async function setAffiliateCookie(
  data: AffiliateCookieData,
  ttlTage: number
): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, JSON.stringify(data), {
    httpOnly: true,
    sameSite: "lax",
    secure:   process.env.NODE_ENV === "production",
    path:     "/",
    maxAge:   ttlTage * 24 * 60 * 60,
  });
}

/** Cookie lesen */
export async function getAffiliateCookie(): Promise<AffiliateCookieData | null> {
  const jar = await cookies();
  const value = jar.get(COOKIE_NAME)?.value;
  if (!value) return null;
  try {
    return JSON.parse(value) as AffiliateCookieData;
  } catch {
    return null;
  }
}

/** Cookie löschen (z.B. nach erfolgreicher Attribution) */
export async function clearAffiliateCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

// ---------------------------------------------------------------------------
// Hash-Helpers (für IP/UA-Fingerprint)
// ---------------------------------------------------------------------------
export function hashWithSalt(value: string): string {
  const salt = process.env.REFERRAL_CODE_SALT ?? "vintage-market-default-salt";
  return createHash("sha256").update(salt + value).digest("hex");
}

const BOT_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /scrap/i, /facebookexternalhit/i,
  /headlesschrome/i, /lighthouse/i, /curl/i, /wget/i, /python/i,
];

export function istBot(userAgent: string): boolean {
  if (!userAgent || userAgent.length < 10) return true;
  return BOT_PATTERNS.some(p => p.test(userAgent));
}
