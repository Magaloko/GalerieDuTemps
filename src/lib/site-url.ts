/**
 * Site-URL-Helper — eine einzige Quelle für die Base-URL der App.
 *
 * Warum nicht direkt `process.env.NEXTAUTH_URL`?
 *
 * Verteilt im Code gab es ~25 Stellen mit Patterns wie:
 *   process.env.NEXTAUTH_URL ?? "http://localhost:3000"
 *   process.env.NEXTAUTH_URL ?? ""
 *   process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "..."
 *
 * Problem in Production: Wenn jemand in Coolify vergisst NEXTAUTH_URL zu
 * setzen, erzeugen wir Newsletter-/Registrierungs-/Passwort-Reset-Mails
 * mit Links auf `http://localhost:3000/...` — Kunden klicken sie an und
 * landen ins Nichts. Die App selbst läuft trotzdem → Silent Failure.
 *
 * Diese Funktion macht das robust:
 *  - **Production**: Wenn KEINE der beiden Vars gesetzt ist, wirft `getSiteUrl()`
 *    einen Error. Lieber lautes Crashen als stille kaputte Links.
 *  - **Development**: Fallback auf http://localhost:3000 — wie bisher.
 *  - **Normalisierung**: Trailing-Slash wird entfernt, damit
 *    `${getSiteUrl()}/katalog` nicht in `//katalog` resultiert.
 *
 * Reihenfolge der Quellen:
 *  1. NEXT_PUBLIC_SITE_URL (im Client + Server verfügbar)
 *  2. NEXTAUTH_URL (klassische Auth-Domain)
 */

let cached: string | null = null;

export function getSiteUrl(): string {
  if (cached !== null) return cached;
  cached = resolveSiteUrl();
  return cached;
}

/** Nur für Tests — Cache invalidieren um neuen ENV-Stand zu testen */
export function __resetSiteUrlCache(): void {
  cached = null;
}

function resolveSiteUrl(): string {
  // Behandle leeren String wie nicht-gesetzt (?? würde "" als gesetzt werten,
  // || hingegen fällt korrekt auf die nächste Quelle zurück).
  const pubUrl  = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const authUrl = process.env.NEXTAUTH_URL?.trim();
  const raw     = pubUrl || authUrl;

  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      // Hard-Error in Production. Das ist absichtlich laut — sonst gehen
      // alle E-Mail-Links auf localhost und Customers können sich nie aktivieren.
      throw new Error(
        "[siteUrl] CRITICAL: weder NEXT_PUBLIC_SITE_URL noch NEXTAUTH_URL " +
        "gesetzt in production. E-Mail-Links würden auf localhost zeigen — " +
        "setze die ENV in Coolify und redeploye sofort.",
      );
    }
    // Dev/Test: localhost ist OK
    return "http://localhost:3000";
  }

  // Normalisieren: Trailing-Slashes entfernen
  return raw.replace(/\/+$/, "");
}

/**
 * Convenience-Helper: vollständige URL bauen mit Pfad.
 *   siteUrl("/katalog")         → "https://galeriedutemps.kz/katalog"
 *   siteUrl("/api/x?a=1")       → "https://galeriedutemps.kz/api/x?a=1"
 *   siteUrl()                   → "https://galeriedutemps.kz"
 */
export function siteUrl(pfad = ""): string {
  if (!pfad) return getSiteUrl();
  return getSiteUrl() + (pfad.startsWith("/") ? pfad : "/" + pfad);
}
