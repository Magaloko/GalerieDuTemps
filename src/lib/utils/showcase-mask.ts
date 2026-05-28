/* ──────────────────────────────────────────────────────────────────────────
 * Schaufenster-Maskierung
 *
 * Im Schaufenster-Modus (kaufen_aktiv = false) darf der EXAKTE Lagerbestand
 * niemals an den Kunden gelangen — weder im HTML, im RSC/Client-Payload noch
 * in einer JSON-API. Diese Helper ersetzen `lagerbestand` durch einen binären
 * Wert (0 = weg, 1 = vorhanden). Im Shop-Modus bleiben die Objekte unverändert.
 *
 * Bewusst generisch (`T extends { lagerbestand: number }`), damit sowohl
 * ProduktListItem als auch reichere Produkt-DTOs maskiert werden können, ohne
 * andere Felder zu verlieren.
 * ────────────────────────────────────────────────────────────────────────── */

/** Einzelnes Produkt-Objekt maskieren. */
export function maskBestand<T extends { lagerbestand: number }>(
  produkt: T,
  kaufenAktiv: boolean,
): T {
  if (kaufenAktiv) return produkt;
  return { ...produkt, lagerbestand: produkt.lagerbestand > 0 ? 1 : 0 };
}

/** Liste von Produkt-Objekten maskieren. */
export function maskBestandListe<T extends { lagerbestand: number }>(
  produkte: T[],
  kaufenAktiv: boolean,
): T[] {
  if (kaufenAktiv) return produkte;
  return produkte.map(p => maskBestand(p, kaufenAktiv));
}
