"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import {
  kontaktStatusUpdate,
  kontaktLoeschen,
  type KontaktStatus,
} from "@/lib/db/kontakt";
import { query } from "@/lib/db";
import { provisionenBerechnen } from "@/lib/affiliate/provisionsberechnung";
import { sendEmail } from "@/lib/email/brevo";
import { neueProvisionMail } from "@/lib/email/affiliate-templates";
import { z } from "zod";

export async function statusAendernAction(id: string, neuerStatus: KontaktStatus): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Не выполнен вход");
  await kontaktStatusUpdate(id, neuerStatus);
  revalidatePath("/admin/kontakt");
}

export async function anfrageLoeschenAction(id: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Не выполнен вход");
  await kontaktLoeschen(id);
  revalidatePath("/admin/kontakt");
}

// ---------------------------------------------------------------------------
// Als verkauft markieren – zentraler Provisions-Trigger
// ---------------------------------------------------------------------------
const VerkauftSchema = z.object({
  preis_eur: z.coerce.number().positive("Цена должна быть положительной"),
});

export type VerkauftState = {
  ok?:               boolean;
  fehler?:           string;
  provisionen_erstellt?: number;
  provisionen_summe_eur?: number;
} | null;

export async function alsVerkauftMarkierenAction(
  kontaktanfrageId: string,
  _prev: VerkauftState,
  formData: FormData
): Promise<VerkauftState> {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
    return { fehler: "Нет прав" };
  }

  const parsed = VerkauftSchema.safeParse({
    preis_eur: formData.get("preis_eur"),
  });
  if (!parsed.success) {
    return { fehler: parsed.error.issues[0]?.message ?? "Некорректная цена" };
  }

  const preisCent = Math.round(parsed.data.preis_eur * 100);

  // Kontaktanfrage laden (für produkt_id)
  const kontaktRes = await query<{ produkt_id: string | null; status: string }>(
    `SELECT produkt_id, status FROM sebo.kontaktanfragen WHERE id = $1`,
    [kontaktanfrageId]
  );
  if (kontaktRes.rows.length === 0) {
    return { fehler: "Заявка не найдена" };
  }
  if (kontaktRes.rows[0].status === "verkauft") {
    return { fehler: "Уже отмечена как проданная" };
  }

  const produktId = kontaktRes.rows[0].produkt_id;

  // 1. Kontaktanfrage auf 'verkauft' setzen
  await query(
    `UPDATE sebo.kontaktanfragen
     SET status = 'verkauft',
         verkaufspreis_cent = $1,
         verkauft_am        = now(),
         verkauft_von_admin_id = $2
     WHERE id = $3`,
    [preisCent, session.user.id, kontaktanfrageId]
  );

  // 2. Provisionen berechnen (kann 0-3 erzeugen, je nach Attribution + MLM-Tiefe)
  let ergebnis: Awaited<ReturnType<typeof provisionenBerechnen>>;
  try {
    ergebnis = await provisionenBerechnen(kontaktanfrageId, preisCent, produktId);
  } catch (err) {
    console.error("[Verkauft] Provisionsberechnung-Fehler:", err);
    revalidatePath("/admin/kontakt");
    return {
      ok:                    true,
      provisionen_erstellt:  0,
      provisionen_summe_eur: 0,
    };
  }

  // 3. Produktname laden (für Mail)
  let produktName: string | null = null;
  if (produktId) {
    const r = await query<{ name: string }>(
      `SELECT name FROM sebo.produkte WHERE id = $1`,
      [produktId]
    ).catch(() => null);
    produktName = r?.rows[0]?.name ?? null;
  }

  // 4. Mails an alle betroffenen Affiliates (parallel, non-blocking)
  await Promise.allSettled(
    ergebnis.betroffene_affiliates.map(b =>
      sendEmail({
        to:      [{ email: b.email, name: b.name }],
        subject: `Neue Provision: ${(b.betrag_cent / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}`,
        htmlContent: neueProvisionMail({
          vorname:           b.name.split(" ")[0],
          betragCent:        b.betrag_cent,
          ebene:             b.ebene,
          produktName,
          verkaufspreisCent: preisCent,
        }),
        tags:    ["affiliate-provision"],
      }).catch(err => console.error("[Verkauft] Brevo:", err))
    )
  );

  revalidatePath("/admin/kontakt");
  revalidatePath("/admin/provisionen");

  const summe = ergebnis.provisionen.reduce((acc, p) => acc + p.betrag_cent, 0);
  return {
    ok:                    true,
    provisionen_erstellt:  ergebnis.provisionen.length,
    provisionen_summe_eur: summe / 100,
  };
}
