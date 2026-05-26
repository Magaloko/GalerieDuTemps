/**
 * Async Server Wrapper für <Header />.
 * Lädt Dictionary + Locale + Kategorien serverseitig und übergibt sie an den
 * Client-Header. So muss kein Caller selbst Daten ziehen.
 */
import { Header } from "./header";
import { getDictionary } from "@/i18n";
import { alleKategorien } from "@/lib/db/kategorien";
import { getMarketingStrings } from "@/lib/db/marketing-strings";

export async function SiteHeader() {
  const [{ t, locale }, kategorien] = await Promise.all([
    getDictionary(),
    alleKategorien().catch(() => []),
  ]);

  // Promo-Bar-Texte aus DB (editierbar in Admin → Marketing-Texte).
  // Fallback auf hardcoded Defaults im Header-Render wenn DB-Werte leer.
  const promo = await getMarketingStrings(
    ["header.promo.links", "header.promo.rechts"],
    locale,
  ).catch(() => ({} as Record<string, string>));

  return (
    <Header
      t={t}
      locale={locale}
      kategorien={kategorien}
      promo={{
        links:  promo["header.promo.links"]  || "",
        rechts: promo["header.promo.rechts"] || "",
      }}
    />
  );
}
