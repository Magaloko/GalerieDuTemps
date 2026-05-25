/**
 * Async Server Wrapper für <Footer />.
 * Lädt Dictionary + Kontakt-Kanäle serverseitig.
 */
import { Footer } from "./footer";
import { getDictionary } from "@/i18n";
import { kontaktKanaeleLaden } from "@/lib/db/kontakt-kanaele";

export async function SiteFooter() {
  const [{ t }, kontakt] = await Promise.all([
    getDictionary(),
    kontaktKanaeleLaden(),
  ]);
  return <Footer t={t} kontakt={kontakt} jahr={new Date().getFullYear()} />;
}
