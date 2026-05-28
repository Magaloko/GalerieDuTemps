import { query } from "./index";

/* ──────────────────────────────────────────────────────────────────────────
 * Feature-Flags — Module-Toggles zur Laufzeit
 *
 * Pattern:
 *   - 5s in-process Memory-Cache (Performance — DB nicht jeder Page-Load)
 *   - Cache invalidiert nach Admin-Update
 *   - Type-safe: FeatureKey ist union der bekannten Slugs
 *
 * Verwendung:
 *
 *   // In Server-Komponente:
 *   if (!await isFeatureEnabled("ki_assistent")) notFound();
 *
 *   // Mehrere auf einmal:
 *   const flags = await getAllFeatures();
 *   if (!flags.b2b_anfragen) return null;
 * ────────────────────────────────────────────────────────────────────────── */

// Bekannte Flags — zentral typisiert. Neu hinzufügen: hier + Migration.
export const FEATURE_FLAGS = {
  b2b_anfragen: {
    label: "B2B-запросы",
    desc:  "Регистрация юр.лиц, UST-ID-поля, B2B-цены. Если выключено — только B2C-клиенты.",
  },
  ki_assistent: {
    label: "ИИ-Ассистент",
    desc:  "Чат-виджет на сайте + страница /assistent. Использует DeepSeek API.",
  },
  wunschliste: {
    label: "Список желаний",
    desc:  "Сердечки на карточках товаров + страница /wunschliste.",
  },
  kontaktformular: {
    label: "Контактная форма",
    desc:  "Страница /kontakt + интеграция с N8N-webhook.",
  },
  auto_translation: {
    label: "Авто-перевод (ИИ)",
    desc:  "При добавлении товара авто-перевод названия/описания на другие языки. Расходует AI-токены.",
  },
  kaufen_aktiv: {
    label: "Покупка / Корзина",
    desc:  "ВКЛ = магазин (корзина, оплата, количество). ВЫКЛ = витрина: только «Запросить», " +
           "наличие показывается как «есть/нет» без количества, корзина и оплата скрыты везде.",
  },
  auto_broadcast_neu: {
    label: "Авто-публикация новинок",
    desc:  "При выставлении товара активным он автоматически публикуется в Telegram-канал " +
           "(один раз, если есть фото). По умолчанию выключено.",
  },
} as const;

export type FeatureKey = keyof typeof FEATURE_FLAGS;
export const ALL_FEATURE_KEYS = Object.keys(FEATURE_FLAGS) as FeatureKey[];

// ── In-Memory-Cache ─────────────────────────────────────────────────────────
// 5s TTL — kurz genug für „sofort nach Admin-Toggle sichtbar" via invalidiate,
// lang genug um Page-Load-Storm nicht jeder DB zu jagen.
const CACHE_TTL_MS = 5_000;
let cache: { data: Record<FeatureKey, boolean>; loaded: number } | null = null;

function clearCache(): void {
  cache = null;
}

async function loadAll(): Promise<Record<FeatureKey, boolean>> {
  const r = await query<{ schluessel: string; aktiviert: boolean }>(
    `SELECT schluessel, aktiviert FROM sebo.feature_flags`,
  );

  // Defaults: Wenn ein Flag in der DB fehlt (z.B. neu hinzugefügt im Code aber
  // Migration noch nicht durch), default auf true. So crasht nichts.
  const map = Object.fromEntries(
    ALL_FEATURE_KEYS.map(k => [k, true]),
  ) as Record<FeatureKey, boolean>;

  for (const row of r.rows) {
    if (row.schluessel in map) {
      map[row.schluessel as FeatureKey] = row.aktiviert;
    }
  }

  // ── Notfall-Kill-Switch ─────────────────────────────────────────────────
  // ENV EMERGENCY_SHOP_DISABLE=true erzwingt SOFORT den Schaufenster-Modus
  // (kaufen_aktiv=false), ohne Code-Deploy und ohne DB-Schreibzugriff. Greift
  // hier zentral, weil sowohl isFeatureEnabled (Anzeige, via getAllFeatures)
  // als auch kaufenGesperrt (fail-closed) über loadAll() laufen.
  if (process.env.EMERGENCY_SHOP_DISABLE === "true") {
    map.kaufen_aktiv = false;
  }

  return map;
}

/** Alle Flags laden (gecached für 5s). */
export async function getAllFeatures(): Promise<Record<FeatureKey, boolean>> {
  const jetzt = Date.now();
  if (cache && jetzt - cache.loaded < CACHE_TTL_MS) {
    return cache.data;
  }
  try {
    const data = await loadAll();
    cache = { data, loaded: jetzt };
    return data;
  } catch (err) {
    // Falls Migration noch nicht angewendet ist (Tabelle existiert nicht):
    // Default auf alle-an, damit nichts blockiert.
    console.warn("[feature-flags] DB-Lookup fehlgeschlagen, Defaults:", err);
    return Object.fromEntries(
      ALL_FEATURE_KEYS.map(k => [k, true]),
    ) as Record<FeatureKey, boolean>;
  }
}

/** Einzelnes Flag prüfen. */
export async function isFeatureEnabled(key: FeatureKey): Promise<boolean> {
  const all = await getAllFeatures();
  return all[key] ?? true;
}

/**
 * Fail-CLOSED Check für kaufen_aktiv — NUR für Order-/Payment-erzeugende
 * Routes (api/checkout*, kaspi, telegram-checkout, method-picker).
 *
 * Anders als isFeatureEnabled (fail-OPEN, gut für reine Anzeige) wird hier
 * bei einem DB-Fehler der Kauf GESPERRT — Sicherheit vor Verfügbarkeit. So
 * kann ein DB-Hiccup nicht versehentlich eine Order/Zahlung im Schaufenster-
 * Modus durchlassen.
 *
 * @returns true = Kauf gesperrt (Schaufenster / DB nicht erreichbar)
 */
/**
 * Fail-OFF Check für auto_broadcast_neu. Liest die Zeile DIREKT (nicht über das
 * fail-open getAllFeatures, das fehlende Keys auf true defaultet) — ein
 * Broadcast-Seiteneffekt darf NIE versehentlich an sein. Fehlt die Zeile (z.B.
 * Migration 043 noch nicht angewandt) oder DB-Fehler → false.
 */
export async function autoBroadcastAktiv(): Promise<boolean> {
  try {
    const r = await query<{ aktiviert: boolean }>(
      `SELECT aktiviert FROM sebo.feature_flags WHERE schluessel = 'auto_broadcast_neu'`,
    );
    return r.rows[0]?.aktiviert === true;
  } catch {
    return false;
  }
}

export async function kaufenGesperrt(): Promise<boolean> {
  try {
    const all = await loadAll();          // bewusst ohne fail-open-catch
    return all.kaufen_aktiv === false;
  } catch (err) {
    console.warn("[feature-flags] kaufenGesperrt → fail-closed:", err);
    return true;                          // DB-Fehler ⇒ sperren
  }
}

/** Flag setzen (Admin-Action). Cache wird invalidiert + Audit-Trail. */
export async function setFeature(
  key: FeatureKey,
  aktiviert: boolean,
  adminEmail?: string,
): Promise<void> {
  // Alten Wert für den Audit-Trail lesen (vor dem Upsert).
  let altWert: boolean | null = null;
  try {
    const vorher = await query<{ aktiviert: boolean }>(
      `SELECT aktiviert FROM sebo.feature_flags WHERE schluessel = $1`,
      [key],
    );
    altWert = vorher.rows[0]?.aktiviert ?? null;
  } catch {/* Audit ist best-effort — Lesefehler ignorieren */}

  await query(
    `INSERT INTO sebo.feature_flags (schluessel, aktiviert, beschreibung, aktualisiert_von)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (schluessel) DO UPDATE
       SET aktiviert = EXCLUDED.aktiviert,
           aktualisiert_von = EXCLUDED.aktualisiert_von`,
    [key, aktiviert, FEATURE_FLAGS[key].desc, adminEmail ?? null],
  );
  clearCache();

  // Audit-Trail nur bei echter Änderung (append-only, best-effort).
  if (altWert !== aktiviert) {
    const { auditLog } = await import("./audit-log");
    await auditLog({
      action:     "feature_flag_changed",
      actorEmail: adminEmail ?? null,
      entity:     key,
      altWert:    { aktiviert: altWert },
      neuWert:    { aktiviert },
    });
  }
}

/** Mehrere Flags auf einmal setzen (z.B. Bulk-Save aus Admin-Form). */
export async function setFeaturesBulk(
  updates: Partial<Record<FeatureKey, boolean>>,
  adminEmail?: string,
): Promise<void> {
  for (const [k, v] of Object.entries(updates)) {
    if (typeof v === "boolean" && k in FEATURE_FLAGS) {
      await setFeature(k as FeatureKey, v, adminEmail);
    }
  }
}

/** Cache manuell leeren (für Tests). */
export function __clearFeatureFlagsCache(): void {
  clearCache();
}

// ── Route-Level-Helper ──────────────────────────────────────────────────────
import { notFound } from "next/navigation";

/**
 * In Server-Pages am Anfang aufrufen, um Routes zu schließen wenn Feature
 * deaktiviert ist. Wirft Next.js notFound() (rendert die not-found.tsx).
 *
 *   export default async function MyPage() {
 *     await requireFeature("ki_assistent");
 *     // ... normaler Page-Code
 *   }
 */
export async function requireFeature(key: FeatureKey): Promise<void> {
  const enabled = await isFeatureEnabled(key);
  if (!enabled) notFound();
}
