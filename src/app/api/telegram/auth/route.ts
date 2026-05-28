import { NextRequest, NextResponse } from "next/server";
import {
  verifyInitData,
  loadBotTokenForAuth,
} from "@/lib/telegram/webapp-auth";
import { resolveTelegramIdentity } from "@/lib/telegram/role-resolver";
import {
  setWebAppSessionCookieByRole,
  clearWebAppSessionCookie,
} from "@/lib/telegram/webapp-session";

export const dynamic     = "force-dynamic";
export const maxDuration = 10;

/* ──────────────────────────────────────────────────────────────────────────
 * POST /api/telegram/auth
 *
 * Body: { initData: string }   — der Wert aus window.Telegram.WebApp.initData
 *
 * Flow:
 *   1. Bot-Token aus DB laden (sebo.kanal_konten)
 *   2. initData via HMAC verifizieren (constant-time)
 *   3. Customer per Telegram-User-ID finden oder anlegen
 *   4. Session-Cookie setzen (eigenständig, nicht NextAuth)
 *
 * Response: { ok: true, customer: {...} } oder 4xx/5xx mit { error, step? }.
 *
 * Diagnostic-Logging: jeder Schritt loggt mit [tg-auth:STEP] Prefix,
 * sodass im Server-Log nachvollziehbar ist wo es klemmt. Bei Fehlern
 * geht der Fehler-Step im JSON-Response mit raus (für Client-Debug).
 * ────────────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const log = (msg: string, extra?: Record<string, unknown>) =>
    console.log(`[tg-auth:${msg}]`, { ms: Date.now() - t0, ...extra });

  let body: { initData?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON", step: "body" }, { status: 400 });
  }
  const initData = body.initData?.trim();
  if (!initData) {
    return NextResponse.json({ error: "initData fehlt", step: "body" }, { status: 400 });
  }
  log("body-ok", { initDataLen: initData.length });

  // ── Step 1: Bot-Token laden ───────────────────────────────────────────────
  let botToken: string | null;
  try {
    botToken = await loadBotTokenForAuth();
  } catch (err) {
    console.error("[tg-auth] loadBotTokenForAuth failed:", err);
    return NextResponse.json(
      {
        error: "База данных недоступна. Попробуйте позже.",
        step:  "load-token",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 503 },
    );
  }
  if (!botToken) {
    return NextResponse.json(
      {
        error: "Бот не настроен. Админ должен подключить токен в /admin/einstellungen/telegram.",
        step:  "no-token",
      },
      { status: 503 },
    );
  }
  log("token-loaded");

  // ── Step 2: initData verifizieren ─────────────────────────────────────────
  const valid = verifyInitData(initData, botToken);
  if (!valid) {
    return NextResponse.json(
      {
        error: "Подпись недействительна или устарела. Закройте Mini-App и откройте заново.",
        step:  "verify",
      },
      { status: 401 },
    );
  }
  log("verified", { user_id: valid.user.id });

  // ── Step 3: Identity resolven (admin > customer > guest) ──────────────────
  let identity;
  try {
    identity = await resolveTelegramIdentity(valid.user.id);
  } catch (err) {
    console.error("[tg-auth] resolveTelegramIdentity failed:", err);
    const msg = err instanceof Error ? err.message : String(err);
    const isMigrationError = msg.includes("telegram_chat_id") || msg.includes("column");
    return NextResponse.json(
      {
        error: isMigrationError
          ? "Применены не все миграции: 026_customer_telegram.sql и 037_admin_telegram.sql."
          : "Ошибка БД при поиске пользователя.",
        step:    "resolve",
        detail:  msg,
      },
      { status: 500 },
    );
  }
  log("identity-resolved", { role: identity.role });

  // ── Step 4: Session-Cookie setzen oder löschen ───────────────────────────
  if (identity.role === "guest") {
    await clearWebAppSessionCookie();
    log("done-guest");
    return NextResponse.json({
      ok:    true,
      role:  "guest",
      hint:  "Аккаунт не привязан. Используйте «Привязать» в Профиле Mini-App.",
    });
  }

  try {
    if (identity.role === "admin" && identity.admin) {
      await setWebAppSessionCookieByRole("admin", identity.admin.id);
      log("done-admin");
      return NextResponse.json({
        ok:   true,
        role: "admin",
        user: {
          id:    identity.admin.id,
          name:  identity.admin.name,
          email: identity.admin.email,
          rolle: identity.admin.rolle,
        },
      });
    }

    if (identity.role === "customer" && identity.customer) {
      await setWebAppSessionCookieByRole("customer", identity.customer.id);
      log("done-customer");
      return NextResponse.json({
        ok:   true,
        role: "customer",
        user: {
          id:       identity.customer.id,
          vorname:  identity.customer.vorname,
          nachname: identity.customer.nachname,
          email:    identity.customer.email,
        },
      });
    }

    // Fallthrough — sollte durch obigen role-Check eigentlich nie kommen
    await clearWebAppSessionCookie();
    return NextResponse.json({ ok: true, role: "guest" });
  } catch (err) {
    console.error("[tg-auth] setWebAppSessionCookie failed:", err);
    return NextResponse.json(
      {
        error:  "Не удалось установить cookie.",
        step:   "cookie",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
