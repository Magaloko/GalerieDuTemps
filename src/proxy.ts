import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";
import { isValidReferralCode } from "@/lib/affiliate/referral-code";

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

  // ─── Admin-Bereich (nur admin/superadmin) ────────────────────────────────
  if (pathname.startsWith("/admin")) {
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
  if (pathname === "/login" && isLoggedIn) {
    const ziel = role === "affiliate" ? "/affiliate"
               : role === "customer"  ? "/kunde"
               : "/admin";
    return NextResponse.redirect(new URL(ziel, req.nextUrl));
  }
  if (pathname === "/affiliate/anmelden" && isLoggedIn && role === "affiliate") {
    return NextResponse.redirect(new URL("/affiliate", req.nextUrl));
  }
  if (pathname === "/kunde/anmelden" && isLoggedIn && role === "customer") {
    return NextResponse.redirect(new URL("/kunde", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Auth-geschützte Bereiche
    "/admin/:path*",
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
