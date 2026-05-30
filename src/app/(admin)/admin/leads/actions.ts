"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth/config";
import { getModuleBase } from "@/lib/module-base-server";
import {
  leadStatusAendern,
  leadPrioritaetAendern,
  leadZuweisen,
  leadKommentarHinzufuegen,
  leadKonvertierenZuCustomer,
  leadById,
  type LeadStatus,
  type LeadPrioritaet,
} from "@/lib/db/leads";
import { customerByEmail, customerErstellen } from "@/lib/db/customers";
import { produktById }  from "@/lib/db/produkte";
import { orderErstellen } from "@/lib/db/orders";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export async function leadStatusAction(
  leadId: string,
  status: LeadStatus
): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };
  await leadStatusAendern(leadId, status, session.user.id);
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/leads");
  return { ok: true };
}

export async function leadPrioritaetAction(
  leadId: string,
  prioritaet: LeadPrioritaet
): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };
  await leadPrioritaetAendern(leadId, prioritaet, session.user.id);
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/leads");
  return { ok: true };
}

export async function leadZuweisenAction(
  leadId: string,
  benutzer_id: string | null
): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };
  await leadZuweisen(leadId, benutzer_id, session.user.id);
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/leads");
  return { ok: true };
}

export async function leadNotizAction(
  leadId:  string,
  text:    string,
  richtung: "outbound" | "interne_notiz"
): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };
  const trimmed = text.trim();
  if (trimmed.length < 1) return { ok: false, error: "Пустое сообщение" };
  await leadKommentarHinzufuegen(leadId, trimmed.slice(0, 5000), session.user.id, richtung);
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true };
}

export async function leadAlsCustomerAnlegenAction(
  leadId: string,
  email:  string,
  name:   string
): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };

  const lcEmail = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lcEmail)) {
    return { ok: false, error: "Некорректный e-mail" };
  }

  let custId: string;
  const existing = await customerByEmail(lcEmail);
  if (existing) {
    custId = existing.id;
  } else {
    const created = await customerErstellen({
      email:          lcEmail,
      vorname:        name.split(" ")[0] ?? "",
      nachname:       name.split(" ").slice(1).join(" ") ?? undefined,
      agb_akzeptiert: false,
    });
    custId = created.id;
  }
  await leadKonvertierenZuCustomer(leadId, custId);
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true, message: "Клиент привязан" };
}

// ───────────────────────────────────────────────────────────────────────────
// Lead → Bestellung
// ───────────────────────────────────────────────────────────────────────────

export interface ProduktSuchTreffer {
  id:           string;
  name:         string;
  slug:         string;
  artikel_code: string | null;
  preis:        number;
  lagerbestand: number;
  hauptbild_url: string | null;
}

export async function produktSuchenAction(q: string): Promise<ProduktSuchTreffer[]> {
  const session = await requireAdminSession();
  if (!session) return [];
  if (!q || q.length < 1) return [];
  const r = await query<ProduktSuchTreffer>(
    `SELECT id, name, slug, artikel_code, preis::float AS preis, lagerbestand,
            hauptbild_url
     FROM sebo.produkte
     WHERE aktiv = true
       AND verkauft = false
       AND (name ILIKE $1 OR slug ILIKE $1 OR artikel_code ILIKE $1)
     ORDER BY name
     LIMIT 20`,
    [`%${q}%`]
  );
  return r.rows;
}

export async function leadZuBestellungAction(
  leadId:    string,
  produktId: string,
  menge:     number
): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };
  if (menge < 1 || menge > 100) return { ok: false, error: "Количество должно быть от 1 до 100" };

  const lead    = await leadById(leadId);
  if (!lead) return { ok: false, error: "Лид не найден" };
  const produkt = await produktById(produktId);
  if (!produkt) return { ok: false, error: "Товар не найден" };
  if (produkt.lagerbestand < menge) {
    return { ok: false, error: `На складе только ${produkt.lagerbestand}` };
  }

  // Customer aufbauen — verlinkt oder per E-Mail anlegen (best-effort)
  let customerId  = lead.customer_id;
  const email     = lead.kontakt_email ?? lead.customer_email ?? null;
  if (!customerId && email) {
    const existing = await customerByEmail(email);
    if (existing) {
      customerId = existing.id;
      await leadKonvertierenZuCustomer(leadId, existing.id);
    } else {
      const neu = await customerErstellen({
        email,
        vorname:        (lead.kontakt_name ?? "").split(" ")[0] || undefined,
        nachname:       (lead.kontakt_name ?? "").split(" ").slice(1).join(" ") || undefined,
        agb_akzeptiert: false,
      });
      customerId = neu.id;
      await leadKonvertierenZuCustomer(leadId, neu.id);
    }
  }
  if (!email) return { ok: false, error: "У лида нет e-mail — создайте клиента вручную" };

  // Preis-Berechnung mit 12 % NDS
  const TAX_RATE        = 12;
  const preisCents      = Math.round(produkt.preis * 100);
  const zeileBruttoCents = preisCents * menge;
  // NDS aus Brutto: brutto / (1+tax/100) = netto; tax = brutto - netto
  const subtotalCents   = Math.round(zeileBruttoCents / (1 + TAX_RATE / 100));
  const taxTotalCents   = zeileBruttoCents - subtotalCents;
  const totalCents      = zeileBruttoCents;

  const emptyAddress = {
    vorname: "", nachname: "", strasse: "", plz: "", ort: "", land: "KZ",
  };

  try {
    const order = await orderErstellen({
      customer_id:    customerId ?? undefined,
      customer_email: email,
      customer_name:  lead.kontakt_name ?? undefined,
      items: [{
        produkt_id:        produkt.id,
        produkt_name:      produkt.name,
        produkt_slug:      produkt.slug,
        produkt_bild_url:  produkt.hauptbild_url ?? produkt.bilder?.[0]?.url ?? undefined,
        menge,
        einzelpreis_cents: Math.round((subtotalCents / menge)),
        tax_rate:          TAX_RATE,
        tax_amount_cents:  taxTotalCents,
        tax_exempt:        false,
      }],
      subtotal_cents:   subtotalCents,
      tax_total_cents:  taxTotalCents,
      total_cents:      totalCents,
      billing_address:  emptyAddress,
      shipping_address: emptyAddress,
      customer_type:    "b2c",
      kunden_notiz:     `Создано из лида: ${leadId}`,
    });

    // Lead aktualisieren: status=qualifiziert + Notiz mit Bestell-Ref
    await leadStatusAendern(leadId, "qualifiziert", session.user.id);
    await leadKommentarHinzufuegen(
      leadId,
      `Создан заказ GDT-${String(order.order_number).padStart(4, "0")} (${menge}× ${produkt.name})`,
      session.user.id,
      "interne_notiz"
    );

    revalidatePath(`/admin/leads/${leadId}`);
    const base = await getModuleBase();
    redirect(`${base}/bestellungen/${order.id}`);
  } catch (err) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
    console.error("[lead-to-order]", err);
    return { ok: false, error: err instanceof Error ? err.message : "Не удалось создать заказ" };
  }
}
