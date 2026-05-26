import { createHmac, randomBytes } from "crypto";
import { cookies } from "next/headers";

/* ──────────────────────────────────────────────────────────────────────────
 * Telegram-WebApp Session-Cookie
 *
 * Klein, signiert, HttpOnly. KEINE volle NextAuth-Session — die ist für
 * normale Login-Flows (Email/Passwort) gedacht. Die Mini App nutzt einen
 * separaten, eigenständigen Session-Cookie, sodass eingeloggte Email-User
 * UND Telegram-WebApp-User unabhängig laufen können.
 *
 * Format des Cookies:
 *   base64(JSON({customerId, exp})) + "." + base64(HMAC_SHA256(...))
 *
 * Secret: AUTH_SECRET (oder NEXTAUTH_SECRET) — gleiche env-var wie NextAuth.
 * Wenn keiner gesetzt ist: random per Boot (sessions invalidieren bei Restart).
 * ────────────────────────────────────────────────────────────────────────── */

const COOKIE_NAME = "__Secure-galerie-tgapp";
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;  // 7 Tage

function getSecret(): string {
  return (
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    // Last-Resort: ein Random per process. Restart invalidiert alle Sessions.
    process.env.__tg_runtime_secret ??
    (process.env.__tg_runtime_secret = randomBytes(32).toString("hex"))
  );
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function fromB64url(s: string): string {
  return Buffer.from(s, "base64url").toString("utf-8");
}

export function signWebAppSession(customerId: string, ttlSeconds = DEFAULT_TTL_SECONDS): string {
  const payload  = { customerId, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const body     = b64url(JSON.stringify(payload));
  const sig      = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export interface WebAppSession { customerId: string; exp: number }

export function verifyWebAppSession(token: string | undefined | null): WebAppSession | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", getSecret()).update(body).digest("base64url");
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const payload = JSON.parse(fromB64url(body)) as WebAppSession;
    if (!payload.customerId || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function setWebAppSessionCookie(customerId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, signWebAppSession(customerId), {
    httpOnly: true,
    secure:   true,
    sameSite: "none",  // Telegram-WebView lädt Cross-Origin von telegram.org
    path:     "/",
    maxAge:   DEFAULT_TTL_SECONDS,
  });
}

export async function clearWebAppSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getWebAppSession(): Promise<WebAppSession | null> {
  const cookieStore = await cookies();
  return verifyWebAppSession(cookieStore.get(COOKIE_NAME)?.value);
}

export const TG_COOKIE_NAME = COOKIE_NAME;
