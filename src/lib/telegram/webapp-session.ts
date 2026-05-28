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
 * Cookie-Format:
 *   base64url(JSON({ role, subjectId, exp })) + "." + base64url(HMAC_SHA256(...))
 *
 *   role:       "admin" | "customer"
 *   subjectId:  bei "admin"   → sebo.benutzer.id
 *               bei "customer" → sebo.customers.id
 *   exp:        Unix-Sekunden
 *
 * Backwards-Compat: alte Cookies hatten nur `{ customerId, exp }` (kein role-
 * Feld). verifyWebAppSession() erkennt das und upgrade'd implizit auf
 * role="customer".
 *
 * Secret: AUTH_SECRET (oder NEXTAUTH_SECRET) — gleiche env-var wie NextAuth.
 * Ohne ENV: random per Boot, Restart invalidiert alle Sessions.
 * ────────────────────────────────────────────────────────────────────────── */

const COOKIE_NAME = "__Secure-galerie-tgapp";
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;  // 7 Tage

function getSecret(): string {
  return (
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
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

export type WebAppRole = "admin" | "customer";

export interface WebAppSession {
  role:        WebAppRole;
  subjectId:   string;
  exp:         number;
  /** Telegram-User-ID, an die diese Session gebunden ist (aus verifiziertem
   *  initData). Erlaubt es zu erkennen, wenn auf einem Gerät mit mehreren
   *  Telegram-Accounts (geteilter Cookie-Jar) ein ANDERER Nutzer das Cookie
   *  präsentiert. Optional für Rückwärtskompatibilität mit alten Cookies. */
  tgId?:       number;
  /** @deprecated alias auf subjectId wenn role="customer" — für Caller die
   *  noch das alte Schema lesen. */
  customerId?: string;
}

export function signWebAppSession(
  role:      WebAppRole,
  subjectId: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
  tgId?:     number,
): string {
  const payload = {
    role, subjectId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    ...(tgId != null ? { tgId } : {}),
  };
  const body = b64url(JSON.stringify(payload));
  const sig  = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

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
    const payload = JSON.parse(fromB64url(body)) as {
      role?:       WebAppRole;
      subjectId?:  string;
      customerId?: string;
      tgId?:       number;
      exp:         number;
    };
    if (!payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    // Neues Format (role + subjectId)
    if (payload.role && payload.subjectId) {
      return {
        role:       payload.role,
        subjectId:  payload.subjectId,
        exp:        payload.exp,
        tgId:       typeof payload.tgId === "number" ? payload.tgId : undefined,
        customerId: payload.role === "customer" ? payload.subjectId : undefined,
      };
    }
    // Backwards-Compat: alter Cookie nur mit customerId
    if (payload.customerId) {
      return {
        role:       "customer",
        subjectId:  payload.customerId,
        exp:        payload.exp,
        customerId: payload.customerId,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** Bestehende Helper-API. */
export async function setWebAppSessionCookie(customerId: string): Promise<void> {
  await setWebAppSessionCookieByRole("customer", customerId);
}

/** Neue, role-aware Variante. `tgId` bindet die Session an den verifizierten
 *  Telegram-Nutzer (siehe WebAppSession.tgId). */
export async function setWebAppSessionCookieByRole(
  role:      WebAppRole,
  subjectId: string,
  tgId?:     number,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, signWebAppSession(role, subjectId, DEFAULT_TTL_SECONDS, tgId), {
    httpOnly: true,
    secure:   true,
    sameSite: "none",
    path:     "/",
    maxAge:   DEFAULT_TTL_SECONDS,
  });
}

export async function clearWebAppSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  // WICHTIG (Sicherheit): Der `__Secure-`-Präfix verlangt, dass das Cookie auch
  // beim LÖSCHEN mit Secure + exakt gleichem Path/SameSite gesendet wird. Ein
  // blankes cookieStore.delete(name) sendet das nicht zuverlässig → der Browser
  // ignoriert die Löschung und ein altes Cookie (z.B. eine Admin-Session) bleibt
  // bestehen. Auf einem Gerät mit mehreren Telegram-Accounts (geteilter
  // Cookie-Jar) würde ein Gast so die Admin-Session erben. Deshalb: explizit als
  // abgelaufenes Cookie mit IDENTISCHEN Attributen überschreiben.
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure:   true,
    sameSite: "none",
    path:     "/",
    maxAge:   0,
  });
}

export async function getWebAppSession(): Promise<WebAppSession | null> {
  const cookieStore = await cookies();
  return verifyWebAppSession(cookieStore.get(COOKIE_NAME)?.value);
}

export const TG_COOKIE_NAME = COOKIE_NAME;
