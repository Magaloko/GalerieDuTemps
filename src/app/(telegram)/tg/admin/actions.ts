"use server";

import { revalidatePath } from "next/cache";
import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { query } from "@/lib/db";
import { b2bFreischalten, b2bAblehnen } from "@/lib/db/customer-b2b";
import { couponToggleAktiv } from "@/lib/db/coupons";
import { auszahlungAlsBezahltMarkieren } from "@/lib/db/auszahlungen";
import { produktAktualisieren, produktReservieren, produktReservierungAufheben } from "@/lib/db/produkte";
import { kategorieErstellen } from "@/lib/db/kategorien";
import { auditLog } from "@/lib/db/audit-log";
import { bildVerarbeiten } from "@/lib/storage/upload";
import { bildEinfuegen, bildLoeschen, hauptbildSetzen } from "@/lib/db/bilder";
import type { ProduktUpdateInput } from "@/lib/utils/validierung";

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
    // Auto-Broadcast beim Veröffentlichen (best-effort/einmalig).
    if (opts.publish) {
      const { autoBroadcastBeiPublish } = await import("@/lib/telegram/neuheiten");
      await autoBroadcastBeiPublish(opts.produktId);
    }
    revalidatePath("/tg/admin/produkte");
    return { ok: true, message: "Обновлено" };
  } catch (err) {
    console.error("[produktSchnellEdit]", err);
    return { ok: false, error: "Ошибка БД" };
  }
}

/* ── Produkt: Reservierung (48h) setzen / aufheben ─────────────────────────── */
export async function produktReservierungTgAction(
  produktId:  string,
  reservieren: boolean,
): Promise<ActionRes> {
  const admin = await requireTgAdmin();
  if (!admin) return { ok: false, error: "Нет прав" };
  try {
    if (reservieren) {
      const ok = await produktReservieren(produktId, 48);
      if (!ok) return { ok: false, error: "Товар продан или уже зарезервирован" };
      await auditLog({ action: "produkt_reserviert", actorEmail: null, entity: produktId, neuWert: { stunden: 48, via: "tg-admin" } });
    } else {
      await produktReservierungAufheben(produktId);
      await auditLog({ action: "produkt_reservierung_aufgehoben", actorEmail: null, entity: produktId, neuWert: { via: "tg-admin" } });
    }
    revalidatePath("/tg/admin/produkte");
    return { ok: true, message: reservieren ? "Зарезервировано на 48ч" : "Резерв снят" };
  } catch (err) {
    console.error("[produktReservierungTg]", err);
    return { ok: false, error: "Ошибка БД" };
  }
}

/* ── Produkt: New-Arrivals-Broadcast in den Kanal ──────────────────────────── */
export async function produktInKanalTgAction(produktId: string): Promise<ActionRes> {
  if (!(await requireTgAdmin())) return { ok: false, error: "Нет прав" };
  try {
    const r = await query<{ slug: string; name: string; preis: number; waehrung: string | null; hauptbild_url: string | null }>(
      `SELECT p.slug, p.name, p.preis, p.waehrung,
              COALESCE(p.hauptbild_url,
                (SELECT pb.url FROM sebo.produktbilder pb WHERE pb.produkt_id = p.id ORDER BY pb.ist_hauptbild DESC, pb.sortierung LIMIT 1)
              ) AS hauptbild_url
         FROM sebo.produkte p WHERE p.id = $1`,
      [produktId],
    );
    const p = r.rows[0];
    if (!p) return { ok: false, error: "Товар не найден" };

    const { broadcastProduktInKanal, markKanalGepostet } = await import("@/lib/telegram/neuheiten");
    const res = await broadcastProduktInKanal({
      slug: p.slug, name: p.name, preis: Number(p.preis), waehrung: p.waehrung, hauptbild_url: p.hauptbild_url,
    });
    if (!res.ok) return { ok: false, error: res.error };

    await markKanalGepostet(produktId);
    await auditLog({ action: "produkt_broadcast_kanal", actorEmail: null, entity: produktId, neuWert: { via: "tg-admin" } });
    return { ok: true, message: "Опубликовано в канал" };
  } catch (err) {
    console.error("[produktInKanalTg]", err);
    return { ok: false, error: "Ошибка отправки" };
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

/* ── Kategorie erstellen ───────────────────────────────────────────────────── */
export async function kategorieErstellenAction(name: string, elternId?: number | null): Promise<ActionRes> {
  if (!(await requireTgAdmin())) return { ok: false, error: "Нет прав" };
  if (!name || name.trim().length < 2) return { ok: false, error: "Название слишком короткое" };
  try {
    await kategorieErstellen({ name: name.trim(), eltern_id: elternId ?? null, aktiv: true });
    revalidatePath("/tg/admin/kategorien");
    return { ok: true, message: "Категория создана" };
  } catch (err) {
    console.error("[kategorieErstellen]", err);
    return { ok: false, error: "Ошибка при создании" };
  }
}

/* ── Produkt: volle Bearbeitung aller Felder ───────────────────────────────── */
export async function produktVollEditAction(
  id: string,
  fields: ProduktUpdateInput,
): Promise<ActionRes> {
  if (!(await requireTgAdmin())) return { ok: false, error: "Нет прав" };
  try {
    const p = await produktAktualisieren(id, fields);
    if (!p) return { ok: false, error: "Товар не найден" };
    revalidatePath(`/tg/admin/produkte/${id}`);
    revalidatePath("/tg/admin/produkte");
    return { ok: true, message: "Сохранено" };
  } catch (err) {
    console.error("[produktVollEdit]", err);
    return { ok: false, error: err instanceof Error ? err.message : "Ошибка БД" };
  }
}

/* ── Produkt-Bild: Upload (FormData mit File) ──────────────────────────────── */
export async function produktBildUploadAction(formData: FormData): Promise<ActionRes> {
  if (!(await requireTgAdmin())) return { ok: false, error: "Нет прав" };
  const produktId = String(formData.get("produktId") ?? "");
  const file      = formData.get("file");
  if (!produktId || !(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Нет файла" };
  }
  try {
    const bild = await bildVerarbeiten(file);
    // Erstes Bild → automatisch Hauptbild
    const vorhandene = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM sebo.produktbilder WHERE produkt_id = $1`, [produktId],
    );
    const istErstes = (vorhandene.rows[0]?.count ?? 0) === 0;
    const neu = await bildEinfuegen({
      produkt_id:    produktId,
      url:           bild.url,
      url_thumb:     bild.url_thumb,
      url_medium:    bild.url_medium,
      url_large:     bild.url_large,
      format:        bild.format,
      ist_hauptbild: istErstes,
      dateigroesse:  bild.dateigroesse,
      breite:        bild.breite,
      hoehe:         bild.hoehe,
      sha256:        bild.sha256,
    });
    if (istErstes) {
      await query(`UPDATE sebo.produkte SET hauptbild_url = $1 WHERE id = $2`, [bild.url, produktId]);
    }
    revalidatePath(`/tg/admin/produkte/${produktId}`);
    return { ok: true, message: `Фото добавлено (#${neu.sortierung ?? ""})` };
  } catch (err) {
    console.error("[produktBildUpload]", err);
    return { ok: false, error: err instanceof Error ? err.message : "Ошибка загрузки" };
  }
}

/* ── Produkt-Bild: löschen ─────────────────────────────────────────────────── */
export async function produktBildLoeschenAction(bildId: string, produktId: string): Promise<ActionRes> {
  if (!(await requireTgAdmin())) return { ok: false, error: "Нет прав" };
  try {
    const geloescht = await bildLoeschen(bildId);
    // Storage-Datei(en) mit aufräumen (Supabase oder Disk) — kein Müll
    if (geloescht?.url) {
      const { bildLoeschenVonDisk } = await import("@/lib/storage/upload");
      await bildLoeschenVonDisk(geloescht.url).catch(() => {});
    }
    revalidatePath(`/tg/admin/produkte/${produktId}`);
    return { ok: true, message: "Удалено" };
  } catch (err) {
    console.error("[produktBildLoeschen]", err);
    return { ok: false, error: "Ошибка" };
  }
}

/* ── Produkt-Bild: als Hauptbild setzen ────────────────────────────────────── */
export async function produktHauptbildAction(bildId: string, produktId: string, url: string): Promise<ActionRes> {
  if (!(await requireTgAdmin())) return { ok: false, error: "Нет прав" };
  try {
    await hauptbildSetzen(bildId, produktId);
    await query(`UPDATE sebo.produkte SET hauptbild_url = $1 WHERE id = $2`, [url, produktId]);
    revalidatePath(`/tg/admin/produkte/${produktId}`);
    return { ok: true, message: "Главное фото обновлено" };
  } catch (err) {
    console.error("[produktHauptbild]", err);
    return { ok: false, error: "Ошибка" };
  }
}
