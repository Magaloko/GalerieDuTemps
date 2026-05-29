"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth/config";
import {
  orderStatusUpdate,
  orderNotizenAktualisieren,
  orderTrackingAktualisieren,
  orderCanceln,
} from "@/lib/db/orders";
import { orderSetPaymentStatus } from "@/lib/db/order-payment";
import type { OrderStatus } from "@/types/commerce";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const STATI: OrderStatus[] = ["pending", "paid", "fulfilled", "completed", "cancelled", "refunded"];

export async function statusAktualisierenAction(
  orderId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Не авторизовано" };

  const status = formData.get("status") as OrderStatus;
  if (!STATI.includes(status)) return { ok: false, error: "Некорректный статус" };

  await orderStatusUpdate(orderId, status, {
    bezahlt: status === "paid",
  });
  revalidatePath(`/admin/bestellungen/${orderId}`);
  revalidatePath("/admin/bestellungen");
  return { ok: true, message: "Статус обновлён." };
}

/* ── Anzahlung-Lebenszyklus (vor_ort_anzahlung) ────────────────────────────── */

/** Anzahlung als erhalten bestätigen → payment_status='partial' (+ anzahlung_bezahlt_am). */
export async function anzahlungErhaltenAction(orderId: string): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Не авторизовано" };

  await orderSetPaymentStatus(orderId, "partial");
  revalidatePath(`/admin/bestellungen/${orderId}`);
  revalidatePath("/admin/bestellungen");
  return { ok: true, message: "Предоплата подтверждена." };
}

/** Voll bezahlt (z.B. Rest bei Abholung) → status='paid' + payment_status='paid'. */
export async function vollBezahltAction(orderId: string): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Не авторизовано" };

  await orderStatusUpdate(orderId, "paid", { bezahlt: true });
  await orderSetPaymentStatus(orderId, "paid").catch(() => {});
  revalidatePath(`/admin/bestellungen/${orderId}`);
  revalidatePath("/admin/bestellungen");
  return { ok: true, message: "Заказ полностью оплачен." };
}

export async function notizenAktualisierenAction(
  orderId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Не авторизовано" };

  const interne = (formData.get("interne_notiz") as string) || null;
  const kunden  = (formData.get("kunden_notiz")  as string) || null;

  await orderNotizenAktualisieren(orderId, interne, kunden);
  revalidatePath(`/admin/bestellungen/${orderId}`);
  return { ok: true, message: "Заметки сохранены." };
}

export async function trackingAktualisierenAction(
  orderId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Не авторизовано" };

  const nummer = (formData.get("tracking_nummer") as string) || null;
  const url    = (formData.get("tracking_url")    as string) || null;

  await orderTrackingAktualisieren(orderId, nummer, url);
  revalidatePath(`/admin/bestellungen/${orderId}`);
  return { ok: true, message: "Трекинг сохранён." };
}

export async function bestellungStornierenAction(
  orderId: string,
  grund: string
): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Не авторизовано" };

  await orderCanceln(orderId, grund || "Отмена администратором");
  revalidatePath(`/admin/bestellungen/${orderId}`);
  revalidatePath("/admin/bestellungen");
  return { ok: true, message: "Заказ отменён." };
}

// ───────────────────────────────────────────────────────────────────────────
// Manuelle Bestellungs-Anlage
// ───────────────────────────────────────────────────────────────────────────

import { redirect } from "next/navigation";
import { query }    from "@/lib/db";
import { orderErstellen }                from "@/lib/db/orders";
import { customerByEmail, customerErstellen } from "@/lib/db/customers";
import { produktById }                   from "@/lib/db/produkte";

export interface CustomerSuchTreffer {
  id:        string;
  email:     string;
  vorname:   string | null;
  nachname:  string | null;
  customer_type: string;
}

export async function customerSuchenAction(q: string): Promise<CustomerSuchTreffer[]> {
  const session = await requireAdminSession();
  if (!session) return [];
  if (!q || q.length < 1) return [];
  const r = await query<CustomerSuchTreffer>(
    `SELECT id, email, vorname, nachname, customer_type
     FROM sebo.customers
     WHERE email      ILIKE $1
        OR vorname    ILIKE $1
        OR nachname   ILIKE $1
        OR company_name ILIKE $1
     ORDER BY letzter_login_am DESC NULLS LAST, erstellt_am DESC
     LIMIT 15`,
    [`%${q}%`]
  );
  return r.rows;
}

export interface ManuellBestellungItem { produkt_id: string; menge: number }
export interface ManuellBestellungInput {
  customer_id?:   string;
  customer_email: string;
  customer_name?: string;
  items:          ManuellBestellungItem[];
  versandart?:    string;
  shipping_address?: {
    vorname?: string; nachname?: string; strasse?: string; plz?: string; ort?: string; land?: string;
  };
  kunden_notiz?:  string;
  status_paid?:   boolean;   // wenn true → Order direkt als bezahlt markieren
}

export async function bestellungManuellAnlegenAction(
  input: ManuellBestellungInput
): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };

  if (!input.customer_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.customer_email)) {
    return { ok: false, error: "Некорректный e-mail клиента" };
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { ok: false, error: "Товары не выбраны" };
  }

  const email = input.customer_email.toLowerCase().trim();

  // Customer auflösen — bestehend oder anlegen
  let customerId  = input.customer_id ?? null;
  let customerType: string = "b2c";
  if (!customerId) {
    const ex = await customerByEmail(email);
    if (ex) {
      customerId   = ex.id;
      customerType = ex.customer_type;
    } else {
      const neu = await customerErstellen({
        email,
        vorname:        (input.customer_name ?? "").split(" ")[0] || undefined,
        nachname:       (input.customer_name ?? "").split(" ").slice(1).join(" ") || undefined,
        agb_akzeptiert: false,
      });
      customerId = neu.id;
    }
  } else {
    const c = await query<{ customer_type: string }>(
      `SELECT customer_type FROM sebo.customers WHERE id = $1`,
      [customerId]
    );
    customerType = c.rows[0]?.customer_type ?? "b2c";
  }

  // Items laden + Preise berechnen
  const TAX_RATE = 12;
  const orderItems = [];
  let subtotalCents = 0;
  let taxTotalCents = 0;
  let totalCents    = 0;

  for (const it of input.items) {
    if (!it.produkt_id || it.menge < 1) {
      return { ok: false, error: "Некорректный товар" };
    }
    const p = await produktById(it.produkt_id);
    if (!p) return { ok: false, error: `Товар ${it.produkt_id.slice(0,8)} не найден` };
    if (p.lagerbestand < it.menge) {
      return { ok: false, error: `${p.name}: на складе только ${p.lagerbestand} (запрошено: ${it.menge})` };
    }
    const preisCents      = Math.round(p.preis * 100);
    const zeileBrutto     = preisCents * it.menge;
    const zeileNetto      = Math.round(zeileBrutto / (1 + TAX_RATE/100));
    const zeileTax        = zeileBrutto - zeileNetto;
    const einzelpreisNetto = Math.round(zeileNetto / it.menge);

    orderItems.push({
      produkt_id:        p.id,
      produkt_name:      p.name,
      produkt_slug:      p.slug,
      produkt_bild_url:  p.hauptbild_url ?? p.bilder?.[0]?.url ?? undefined,
      menge:             it.menge,
      einzelpreis_cents: einzelpreisNetto,
      tax_rate:          TAX_RATE,
      tax_amount_cents:  zeileTax,
      tax_exempt:        false,
    });

    subtotalCents += zeileNetto;
    taxTotalCents += zeileTax;
    totalCents    += zeileBrutto;
  }

  const shippingAddr = {
    vorname:  input.shipping_address?.vorname  ?? input.customer_name?.split(" ")[0] ?? "",
    nachname: input.shipping_address?.nachname ?? input.customer_name?.split(" ").slice(1).join(" ") ?? "",
    strasse:  input.shipping_address?.strasse  ?? "",
    plz:      input.shipping_address?.plz      ?? "",
    ort:      input.shipping_address?.ort      ?? "",
    land:     input.shipping_address?.land     ?? "KZ",
  };

  try {
    const order = await orderErstellen({
      customer_id:    customerId ?? undefined,
      customer_email: email,
      customer_name:  input.customer_name ?? undefined,
      items:          orderItems,
      subtotal_cents: subtotalCents,
      tax_total_cents: taxTotalCents,
      total_cents:    totalCents,
      billing_address: shippingAddr,
      shipping_address: shippingAddr,
      versandart:     input.versandart ?? "standard",
      customer_type:  customerType,
      kunden_notiz:   input.kunden_notiz?.trim() || `Создано вручную: ${session.user.name ?? session.user.email}`,
    });

    // Optional sofort als bezahlt markieren
    if (input.status_paid) {
      await orderStatusUpdate(order.id, "paid", { bezahlt: true });
    }

    revalidatePath("/admin/bestellungen");
    redirect(`/admin/bestellungen/${order.id}`);
  } catch (err) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
    console.error("[manuell-anlegen]", err);
    return { ok: false, error: err instanceof Error ? err.message : "Не удалось создать заказ" };
  }
}
