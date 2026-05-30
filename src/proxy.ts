import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";
import { isValidReferralCode } from "@/lib/affiliate/referral-code";
import { ADMIN_VIEW_COOKIE, ADMIN_VIEW_HOME, parseAdminView } from "@/lib/admin-view";

// ---------------------------------------------------------------------------
// Auth-Proxy + Affiliate-Tracking
// - Erkennt ?ref=CODE und setzt Cookie (Lightweight, kein DB-Call hier)
// - Schützt /admin/* und /affiliate/* rollenbasiert
// ---------------------------------------------------------------------------
export default auth((req) => {
  const { pathname, searchParams } = req.nextUrl;
  const isLoggedIn   = !!req.auth;
  const role         = req.auth?.user?.role;

  // ─── ?ref=CODE auf öffentlichen Seiten → Cookie setzen ───────────────────
  //   (Tieferer DB-Lookup + Klick-Log erfolgt nur bei /r/[code] Short-Links)
  //   DSGVO: nur setzen wenn Consent (vm_consent_aff=1)
  const refParam = searchParams.get("ref");
  if (refParam && isValidReferralCode(refParam)) {
    const codeUp     = refParam.toUpperCase();
    const consentOk  = req.cookies.get("vm_consent_aff")?.value === "1";
    const cleanUrl   = new URL(req.nextUrl);
    cleanUrl.searchParams.delete("ref");

    const response = NextResponse.redirect(cleanUrl);
    if (consentOk) {
      response.cookies.set("aff_ref", JSON.stringify({
        code:     codeUp,
        klick_id: null,
        set_at:   Date.now(),
      }), {
        httpOnly: true,
        sameSite: "lax",
        secure:   process.env.NODE_ENV === "production",
        path:     "/",
        maxAge:   30 * 24 * 60 * 60,
      });
    }
    // Wenn kein Consent: redirect ohne Cookie (User kann ihn später im Banner geben)
    return response;
  }

  // ─── Operator-Bereiche (/admin = klassisch, /app = mobile App-Shell) ────
  //   Beide nur für admin/superadmin. Telegram-Mini-App (/tg) eigene Logik.
  if (pathname.startsWith("/admin") || pathname.startsWith("/app")) {
    if (!isLoggedIn) {
      const url = new URL("/login", req.nextUrl);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (role !== "admin" && role !== "superadmin") {
      return NextResponse.redirect(new URL("/affiliate", req.nextUrl));
    }
  }

  // ─── Affiliate-Bereich ───────────────────────────────────────────────────
  if (
    pathname.startsWith("/affiliate") &&
    !pathname.startsWith("/affiliate/anmelden") &&
    !pathname.startsWith("/affiliate/registrieren") &&
    !pathname.startsWith("/affiliate/passwort-vergessen") &&
    !pathname.startsWith("/affiliate/programm")
  ) {
    if (!isLoggedIn) {
      const url = new URL("/affiliate/anmelden", req.nextUrl);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (role !== "affiliate") {
      return NextResponse.redirect(new URL("/admin", req.nextUrl));
    }
  }

  // ─── Customer-Bereich ────────────────────────────────────────────────────
  if (
    pathname.startsWith("/kunde") &&
    !pathname.startsWith("/kunde/anmelden") &&
    !pathname.startsWith("/kunde/registrieren") &&
    !pathname.startsWith("/kunde/passwort-vergessen") &&
    !pathname.startsWith("/kunde/passwort-neu") &&
    !pathname.startsWith("/kunde/bestaetigt")
  ) {
    if (!isLoggedIn) {
      const url = new URL("/kunde/anmelden", req.nextUrl);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (role !== "customer") {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
  }

  // ─── Login-Seiten: eingeloggte umleiten ──────────────────────────────────
  //   Admin/Superadmin landen in ihrer bevorzugten Operator-View
  //   (Cookie gdt_admin_view, Default = "app"). Telegram bleibt davon
  //   unberührt — /tg hat eigenen Auth-Flow.
  if (pathname === "/login" && isLoggedIn) {
    const adminView = parseAdminView(req.cookies.get(ADMIN_VIEW_COOKIE)?.value);
    const ziel = role === "affiliate" ? "/affiliate"
               : role === "customer"  ? "/kunde"
               : ADMIN_VIEW_HOME[adminView];
    return NextResponse.redirect(new URL(ziel, req.nextUrl));
  }
  if (pathname === "/affiliate/anmelden" && isLoggedIn && role === "affiliate") {
    return NextResponse.redirect(new URL("/affiliate", req.nextUrl));
  }
  if (pathname === "/kunde/anmelden" && isLoggedIn && role === "customer") {
    return NextResponse.redirect(new URL("/kunde", req.nextUrl));
  }

  // x-pathname-Header durchreichen, damit Server-Components/Actions die aktuelle
  // Route kennen (für getModuleBase() → /app vs /admin). Header wird am Request
  // gesetzt, nicht an der Response — so liest ihn das Server-Rendering.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: [
    // Auth-geschützte Bereiche
    "/admin/:path*",
    "/app/:path*",
    "/affiliate/:path*",
    "/login",
    "/api/produkte/:path*",
    "/api/bilder/:path*",
    "/api/statistiken/:path*",
    "/api/admin/:path*",
    "/api/affiliate/:path*",
    "/api/customer/:path*",
    "/kunde/:path*",
    // Public-Seiten für ?ref=CODE Erkennung
    "/",
    "/katalog/:path*",
    "/kategorien/:path*",
    "/kontakt",
    "/about",
    "/wunschliste",
  ],
};
