/**
 * SEPA Credit Transfer XML Generator (pain.001.001.03)
 *
 * Erzeugt eine Sammel-Überweisungsdatei, die in Banking-Software importiert werden kann.
 * Format: ISO 20022 pain.001.001.03 — von allen deutschen Banken akzeptiert.
 *
 * Spec: https://www.ebics.de/de/datenformate/zahlungsverkehr
 */

export interface SepaAbsender {
  name:        string;
  iban:        string;       // Whitespace wird entfernt
  bic?:        string;
  creditor_id?: string;
}

export interface SepaEmpfaenger {
  name:         string;
  iban:         string;
  bic?:         string;
  betrag_cent:  number;
  verwendungszweck: string;
  ende_zu_ende_id?: string;
}

export interface SepaSammel {
  absender:    SepaAbsender;
  empfaenger:  SepaEmpfaenger[];
  ausfuehrungs_datum?: Date;
  nachricht_id?: string;
}

// ---------------------------------------------------------------------------
// XML-Escape Helper
// ---------------------------------------------------------------------------
function esc(s: string): string {
  return s
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&apos;");
}

function ibanClean(iban: string): string {
  return iban.replace(/\s/g, "").toUpperCase();
}

function cent2Eur(cent: number): string {
  return (cent / 100).toFixed(2);
}

function nextDate(d?: Date): string {
  const date = d ?? new Date(Date.now() + 24 * 60 * 60 * 1000); // morgen
  return date.toISOString().slice(0, 10);
}

function uuid(): string {
  // Kompakt für SEPA-IDs (max. 35 Zeichen)
  return Math.random().toString(36).slice(2, 12).toUpperCase() +
         Date.now().toString(36).toUpperCase();
}

// ---------------------------------------------------------------------------
// Validierung (Basis – Banking-Software prüft tiefer)
// ---------------------------------------------------------------------------
export function sepaValidieren(sammel: SepaSammel): string[] {
  const fehler: string[] = [];

  if (!sammel.absender.name)               fehler.push("Absender-Name fehlt");
  if (!sammel.absender.iban)               fehler.push("Absender-IBAN fehlt");
  if (sammel.empfaenger.length === 0)      fehler.push("Keine Empfänger");

  for (const [i, e] of sammel.empfaenger.entries()) {
    if (!e.name)                            fehler.push(`Empfänger #${i+1}: Name fehlt`);
    if (!e.iban || ibanClean(e.iban).length < 15) fehler.push(`Empfänger #${i+1}: ungültige IBAN`);
    if (!e.betrag_cent || e.betrag_cent <= 0)     fehler.push(`Empfänger #${i+1}: ungültiger Betrag`);
    if (e.verwendungszweck.length > 140)          fehler.push(`Empfänger #${i+1}: Verwendungszweck > 140 Zeichen`);
  }
  return fehler;
}

// ---------------------------------------------------------------------------
// XML-Generator
// ---------------------------------------------------------------------------
export function generiereSepaXml(sammel: SepaSammel): string {
  const erstellungs_zeit = new Date().toISOString();
  const nachricht_id     = sammel.nachricht_id ?? `VM${uuid()}`;
  const payment_info_id  = `PMTINF${uuid()}`;
  const ausfuehrungs_dat = nextDate(sammel.ausfuehrungs_datum);
  const summe_cent       = sammel.empfaenger.reduce((acc, e) => acc + e.betrag_cent, 0);
  const anzahl           = sammel.empfaenger.length;

  const transaktionen = sammel.empfaenger.map((e, i) => `
    <CdtTrfTxInf>
      <PmtId>
        <EndToEndId>${esc(e.ende_zu_ende_id ?? `GDT-${i+1}-${Date.now()}`).slice(0, 35)}</EndToEndId>
      </PmtId>
      <Amt>
        <InstdAmt Ccy="EUR">${cent2Eur(e.betrag_cent)}</InstdAmt>
      </Amt>
      ${e.bic ? `<CdtrAgt><FinInstnId><BIC>${esc(e.bic)}</BIC></FinInstnId></CdtrAgt>` : ""}
      <Cdtr>
        <Nm>${esc(e.name).slice(0, 70)}</Nm>
      </Cdtr>
      <CdtrAcct>
        <Id><IBAN>${ibanClean(e.iban)}</IBAN></Id>
      </CdtrAcct>
      <RmtInf>
        <Ustrd>${esc(e.verwendungszweck).slice(0, 140)}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  `).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${esc(nachricht_id).slice(0, 35)}</MsgId>
      <CreDtTm>${erstellungs_zeit}</CreDtTm>
      <NbOfTxs>${anzahl}</NbOfTxs>
      <CtrlSum>${cent2Eur(summe_cent)}</CtrlSum>
      <InitgPty>
        <Nm>${esc(sammel.absender.name).slice(0, 70)}</Nm>
        ${sammel.absender.creditor_id ? `<Id><OrgId><Othr><Id>${esc(sammel.absender.creditor_id)}</Id></Othr></OrgId></Id>` : ""}
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${esc(payment_info_id).slice(0, 35)}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>${anzahl}</NbOfTxs>
      <CtrlSum>${cent2Eur(summe_cent)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl><Cd>SEPA</Cd></SvcLvl>
      </PmtTpInf>
      <ReqdExctnDt>${ausfuehrungs_dat}</ReqdExctnDt>
      <Dbtr>
        <Nm>${esc(sammel.absender.name).slice(0, 70)}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id><IBAN>${ibanClean(sammel.absender.iban)}</IBAN></Id>
      </DbtrAcct>
      ${sammel.absender.bic ? `<DbtrAgt><FinInstnId><BIC>${esc(sammel.absender.bic)}</BIC></FinInstnId></DbtrAgt>` : "<DbtrAgt><FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId></DbtrAgt>"}
      <ChrgBr>SLEV</ChrgBr>
      ${transaktionen}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;
}
