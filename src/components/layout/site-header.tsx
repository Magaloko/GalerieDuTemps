/**
 * Async Server Wrapper für <Header />.
 * Lädt Dictionary + Locale serverseitig und übergibt sie an die Client-Header.
 *
 * Importiert von allen public-Pages, die KEIN /app/(public)/layout.tsx-Layout nutzen
 * (z.B. /journal, /impressum, /kunde/* …). So muss kein Caller das Dictionary holen.
 */
import { Header } from "./header";
import { getDictionary } from "@/i18n";

export async function SiteHeader() {
  const { t, locale } = await getDictionary();
  return <Header t={t} locale={locale} />;
}
