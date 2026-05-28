/**
 * Minimaler HTML-Escape für dynamische Werte in HTML-Kontexten:
 *  - Telegram sendMessage parse_mode="HTML"
 *  - E-Mail-Templates (Bestellbestätigung etc.)
 *
 * Verhindert dass User-/Carrier-/Admin-Eingaben mit <, >, &, " das Markup
 * brechen oder ungewollte Tags/Links einschleusen.
 */
export function escapeHtml(input: string | number | null | undefined): string {
  if (input == null) return "";
  return String(input).replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" :
    c === "<" ? "&lt;"  :
    c === ">" ? "&gt;"  :
                "&quot;"
  );
}
