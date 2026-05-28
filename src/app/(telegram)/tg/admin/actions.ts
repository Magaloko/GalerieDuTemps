"use server";

import { revalidatePath } from "next/cache";
import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { query } from "@/lib/db";
import { b2bFreischalten, b2bAblehnen } from "@/lib/db/customer-b2b";
import { couponToggleAktiv } from "@/lib/db/coupons";
import { auszahlungAlsBezahltMarkieren } from "@/lib/db/auszahlungen";

/* ──────────────────────────────────────────────────────────────────────────
 * Server-Actions für die Admin-Mini-App.
 *
 * Auth: getWebAppSession() liest den telegram-webapp-Session-Cookie und prüft
 * role === "admin". KEINE NextAuth-Session nötig — die Mini-App läuft auf
 * ihrer eigenen Session. Jede Action guarded selbst.
 * ────────────────────────────────────────────────────────────────────────── */

export type ActionRes = { ok: true; message?: string } | { ok: false; error: string };

async function requireTgAdmin(): Promise<{ id: string } | null> {
  const s = await getWebAppSession();
  if (!s || s.role !== "admin") return null;
  return { id: s.subjectId };
}

/* ── Produkt: Preis / Publish / Hide ───────────────────────────────────────── */
export async function produktSchnellEditAction(opts: {
  produktId: string;
  preis?:    number;
  publish?:  boolean;
  hide?:     boolean;
}): Promise<ActionRes> {
  if (!(await requireTgAdmin())) return { ok: false, error: "Нет прав" };

  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (typeof opts.preis === "number" && opts.preis > 0) { sets.push(`preis = $${i++}`); vals.push(opts.preis); }
  if (opts.publish) sets.push(`aktiv = true`, `b2c_mode = 'visible'`, `veroeffentlicht_am = COALESCE(veroeffentlicht_am, now())`);
  if (opts.hide)    sets.push(`aktiv = false`, `b2c_mode = 'hidden'`);
  if (sets.length === 0) return { ok: false, error: "Нечего менять" };

  vals.push(opts.produktId);
  try {
    const r = await query(`UPDATE sebo.produkte SET ${sets.join(", ")}, aktualisiert_am = now() WHERE id = $${i}`, vals);
    if (!r.rowCount) return { ok: false, error: "Товар не найден" };
    revalidatePath("/tg/admin/produkte");
    return { ok: true, message: "Обновлено" };
  } catch (err) {
    console.error("[produktSchnellEdit]", err);
    return { ok: false, error: "Ошибка БД" };
  }
}

/* ── B2B: Freischalten / Ablehnen ──────────────────────────────────────────── */
export async function b2bFreischaltenAction(customerId: string): Promise<ActionRes> {
  if (!(await requireTgAdmin())) return { ok: false, error: "Нет прав" };
  try {
    await b2bFreischalten(customerId);
    revalidatePath("/tg/admin/b2b");
    return { ok: true, message: "B2B подтверждён" };
  } catch (err) {
    console.error("[b2bFreischalten]", err);
    return { ok: false, error: "Ошибка" };
  }
}

export async function b2bAblehnenAction(customerId: string, grund: string): Promise<ActionRes> {
  if (!(await requireTgAdmin())) return { ok: false, error: "Нет прав" };
  try {
    await b2bAblehnen(customerId, grund || "—");
    revalidatePath("/tg/admin/b2b");
    return { ok: true, message: "B2B отклонён" };
  } catch (err) {
    console.error("[b2bAblehnen]", err);
    return { ok: false, error: "Ошибка" };
  }
}

/* ── Coupon: aktiv toggeln ─────────────────────────────────────────────────── */
export async function couponToggleAction(id: string, aktiv: boolean): Promise<ActionRes> {
  if (!(await requireTgAdmin())) return { ok: false, error: "Нет прав" };
  try {
    await couponToggleAktiv(id, aktiv);
    revalidatePath("/tg/admin/coupons");
    return { ok: true, message: aktiv ? "Активирован" : "Выключен" };
  } catch (err) {
    console.error("[couponToggle]", err);
    return { ok: false, error: "Ошибка" };
  }
}

/* ── Auszahlung: als bezahlt markieren ─────────────────────────────────────── */
export async function auszahlungBezahltAction(id: string): Promise<ActionRes> {
  const admin = await requireTgAdmin();
  if (!admin) return { ok: false, error: "Нет прав" };
  try {
    await auszahlungAlsBezahltMarkieren(id, admin.id);
    revalidatePath("/tg/admin/auszahlungen");
    return { ok: true, message: "Отмечено как выплачено" };
  } catch (err) {
    console.error("[auszahlungBezahlt]", err);
    return { ok: false, error: "Ошибка" };
  }
}
