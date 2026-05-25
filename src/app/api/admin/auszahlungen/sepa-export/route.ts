import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { query } from "@/lib/db";
import { systemEinstellungenLaden } from "@/lib/db/system-einstellungen";
import { generiereSepaXml, sepaValidieren, type SepaEmpfaenger } from "@/lib/affiliate/sepa";
import { ibanLaden } from "@/lib/db/affiliates";

export const dynamic = "force-dynamic";

/**
 * Erzeugt SEPA-XML-Datei für eine Liste von Auszahlungs-IDs (alle 'erstellt'-Status).
 * GET-Param: ?ids=uuid1,uuid2,...   ODER  ?all=true (alle offenen SEPA-Auszahlungen)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
    return NextResponse.json({ error: "Nicht berechtigt" }, { status: 401 });
  }

  const sys = await systemEinstellungenLaden();
  if (!sys.sepa_absender_iban) {
    return NextResponse.json({
      error: "Absender-IBAN nicht konfiguriert. Bitte unter /admin/einstellungen eintragen.",
    }, { status: 400 });
  }

  const idsParam = req.nextUrl.searchParams.get("ids");
  const all      = req.nextUrl.searchParams.get("all") === "true";

  let whereClause: string;
  let params:      unknown[];
  if (all) {
    whereClause = `au.status = 'erstellt' AND au.methode = 'sepa'`;
    params      = [];
  } else if (idsParam) {
    const ids = idsParam.split(",").filter(Boolean);
    if (ids.length === 0) return NextResponse.json({ error: "Keine IDs" }, { status: 400 });
    whereClause = `au.id = ANY($1::uuid[]) AND au.methode = 'sepa'`;
    params      = [ids];
  } else {
    return NextResponse.json({ error: "ids oder all=true erforderlich" }, { status: 400 });
  }

  // Auszahlungen + Affiliate-Daten laden
  const result = await query<{
    auszahlung_id: string;
    betrag_cent:   number;
    affiliate_id:  string;
    affiliate_name: string;
    bic:           string | null;
    referenz:      string | null;
  }>(
    `SELECT au.id AS auszahlung_id, au.betrag_cent, au.referenz,
            a.id AS affiliate_id,
            (a.vorname || ' ' || a.nachname) AS affiliate_name,
            a.bic
     FROM sebo.auszahlungen au
     JOIN sebo.affiliates    a ON a.id = au.affiliate_id
     WHERE ${whereClause}`,
    params
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Keine SEPA-Auszahlungen gefunden" }, { status: 404 });
  }

  // IBANs entschlüsseln (pgcrypto)
  const encKey = process.env.IBAN_ENCRYPTION_KEY;
  if (!encKey) {
    return NextResponse.json({
      error: "IBAN_ENCRYPTION_KEY nicht gesetzt — IBANs können nicht entschlüsselt werden",
    }, { status: 500 });
  }

  const empfaenger: SepaEmpfaenger[] = [];
  for (const row of result.rows) {
    const iban = await ibanLaden(row.affiliate_id, encKey);
    if (!iban) {
      return NextResponse.json({
        error: `Affiliate "${row.affiliate_name}" hat keine IBAN hinterlegt`,
      }, { status: 400 });
    }
    empfaenger.push({
      name:             row.affiliate_name,
      iban,
      bic:              row.bic ?? undefined,
      betrag_cent:      row.betrag_cent,
      verwendungszweck: row.referenz ?? `Galerie du Temps Provision ${row.auszahlung_id.slice(0,8)}`,
      ende_zu_ende_id:  `GDT-${row.auszahlung_id.slice(0, 28)}`,
    });
  }

  const sammel = {
    absender: {
      name:        sys.sepa_absender_name,
      iban:        sys.sepa_absender_iban,
      bic:         sys.sepa_absender_bic || undefined,
      creditor_id: sys.sepa_creditor_id   || undefined,
    },
    empfaenger,
  };

  const fehler = sepaValidieren(sammel);
  if (fehler.length > 0) {
    return NextResponse.json({ error: "Validierungsfehler", details: fehler }, { status: 422 });
  }

  const xml      = generiereSepaXml(sammel);
  const dateinme = `sepa-${new Date().toISOString().slice(0, 10)}.xml`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type":        "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${dateinme}"`,
    },
  });
}
