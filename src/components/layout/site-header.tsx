/**
 * Async Server Wrapper für <Header />.
 * Lädt Dictionary + Locale + Kategorien serverseitig und übergibt sie an den
 * Client-Header. So muss kein Caller selbst Daten ziehen.
 */
import { Header } from "./header";
import { getDictionary } from "@/i18n";
import { alleKategorien } from "@/lib/db/kategorien";

export async function SiteHeader() {
  const [{ t, locale }, kategorien] = await Promise.all([
    getDictionary(),
    alleKategorien().catch(() => []),
  ]);
  return <Header t={t} locale={locale} kategorien={kategorien} />;
}
