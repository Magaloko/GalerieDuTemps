/**
 * Async Server Wrapper für <Header />.
 * Lädt Dictionary + Locale + Kategorien serverseitig und übergibt sie an den
 * Client-Header. So muss kein Caller selbst Daten ziehen.
 */
import { Header } from "./header";
import { getDictionary } from "@/i18n";
import { alleKategorien } from "@/lib/db/kategorien";
import { getMarketingStrings } from "@/lib/db/marketing-strings";
import { auth } from "@/lib/auth/config";

export async function SiteHeader() {
  const [{ t, locale }, kategorien, session] = await Promise.all([
    getDictionary(),
    alleKategorien().catch(() => []),
    auth().catch(() => null),
  ]);

  // Promo-Bar-Texte aus DB (editierbar in Admin → Marketing-Texte).
  // Fallback auf hardcoded Defaults im Header-Render wenn DB-Werte leer.
  const promo = await getMarketingStrings(
    ["header.promo.links", "header.promo.rechts"],
    locale,
  ).catch(() => ({} as Record<string, string>));

  // Session-aware User-Link: eingeloggte User landen direkt in ihrem Dashboard,
  // statt erst über /anmelden→Proxy-Redirect zu gehen. Verhindert das
  // „ich bin doch eingeloggt, warum sehe ich das Login-Formular?"-Erlebnis.
  const role = session?.user?.role;
  const userHref =
    role === "customer"   ? "/kunde"
    : role === "affiliate" ? "/affiliate"
    : role === "admin" || role === "superadmin" ? "/admin"
    : "/kunde/anmelden";
  const userEingeloggt = !!session?.user;

  return (
    <Header
      t={t}
      locale={locale}
      kategorien={kategorien}
      promo={{
        links:  promo["header.promo.links"]  || "",
        rechts: promo["header.promo.rechts"] || "",
      }}
      userHref={userHref}
      userEingeloggt={userEingeloggt}
    />
  );
}
