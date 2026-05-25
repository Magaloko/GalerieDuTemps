/**
 * EPC-QR-Code (SEPA Credit Transfer) – Format gemäß EPC069-12.
 * Kann von Banking-Apps gescannt werden, um Überweisung vorzubefüllen.
 *
 * Spec: https://www.europeanpaymentscouncil.eu/document-library/guidance-documents/quick-response-code-guidelines-enable-data-capture-initiation
 */

export interface EpcQrData {
  empfaenger:       string;          // Name (max 70)
  iban:             string;          // IBAN
  bic?:             string;          // BIC (optional)
  betrag_cents:     number;          // Betrag in Cent
  verwendungszweck: string;          // max 140 Zeichen
  referenz?:        string;          // strukturierte Referenz (max 35)
}

export function generiereEpcText(data: EpcQrData): string {
  const lines = [
    "BCD",                                                              // Service-Tag
    "002",                                                              // Version
    "1",                                                                // Encoding UTF-8
    "SCT",                                                              // SEPA Credit Transfer
    (data.bic ?? "").slice(0, 11),                                      // BIC (kann leer sein)
    data.empfaenger.slice(0, 70),                                       // Name
    data.iban.replace(/\s/g, "").toUpperCase(),                         // IBAN
    `EUR${(data.betrag_cents / 100).toFixed(2)}`,                       // Betrag
    "",                                                                 // Zweck-Code (leer)
    (data.referenz ?? "").slice(0, 35),                                 // Strukturierte Referenz
    data.verwendungszweck.slice(0, 140),                                // Verwendungszweck
    "",                                                                 // Display-Info
  ];
  return lines.join("\n");
}
