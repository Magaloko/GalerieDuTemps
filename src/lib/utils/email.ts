/* ──────────────────────────────────────────────────────────────────────────
 * E-Mail-Helfer — Platzhalter-Adressen für Telegram-first-Konten ohne E-Mail.
 *
 * Telegram-first-Kunden haben keine echte E-Mail. Order/Invoice-Snapshots
 * brauchen aber teils einen non-null String. Wir verwenden eine stabile,
 * eindeutige, NICHT versendbare `.local`-Adresse — und filtern sie überall, wo
 * tatsächlich versendet/persistiert wird, mit `istPlatzhalterEmail()` wieder weg.
 * ────────────────────────────────────────────────────────────────────────── */

/** Domain für nicht-versendbare Platzhalter-Adressen. */
export const PLATZHALTER_EMAIL_DOMAIN = "telegram.galeriedutemps.local";

/** Stabile, eindeutige, nicht-versendbare Platzhalter-Adresse für ein Telegram-Konto. */
export function telegramPlatzhalterEmail(chatId: number | string): string {
  return `tg-${chatId}@${PLATZHALTER_EMAIL_DOMAIN}`;
}

/**
 * True, wenn die Adresse leer ODER eine nicht-versendbare Platzhalter-Adresse
 * ist (`.local`-TLD). Nutzen, bevor man an die Adresse mailt oder sie in
 * Rechnungs-/Versand-Datensätze schreibt.
 */
export function istPlatzhalterEmail(email: string | null | undefined): boolean {
  if (!email) return true;
  return /\.local$/i.test(email.trim());
}
