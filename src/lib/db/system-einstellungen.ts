import { query } from "./index";
import type { SystemEinstellungen } from "@/types/affiliate";

const DEFAULTS: SystemEinstellungen = {
  firma_name:            "Galerie du Temps",
  firma_strasse:         "",
  firma_plz:             "",
  firma_ort:             "",
  firma_land:            "DE",
  firma_email:           "",
  firma_telefon:         "",
  firma_steuer_id:       "",
  firma_ust_id:          "",
  firma_handelsregister: "",
  sepa_absender_iban:    "",
  sepa_absender_bic:     "",
  sepa_absender_name:    "Galerie du Temps",
  sepa_creditor_id:      "",
  stripe_connect_enabled: false,
  stripe_publishable_key: "",
  stripe_mode:           "test",
  cookie_banner_aktiv:   true,
  analytics_aktiv:       false,
};

let cache: { value: SystemEinstellungen; expires: number } | null = null;
const CACHE_TTL_MS = 60_000;

/** Alle System-Einstellungen laden (mit 60s cache) */
export async function systemEinstellungenLaden(): Promise<SystemEinstellungen> {
  if (cache && cache.expires > Date.now()) return cache.value;

  try {
    const result = await query<{ schluessel: string; wert: string }>(
      `SELECT schluessel, wert FROM sebo.affiliate_einstellungen
       WHERE schluessel IN (
         'firma_name','firma_strasse','firma_plz','firma_ort','firma_land',
         'firma_email','firma_telefon','firma_steuer_id','firma_ust_id','firma_handelsregister',
         'sepa_absender_iban','sepa_absender_bic','sepa_absender_name','sepa_creditor_id',
         'stripe_connect_enabled','stripe_publishable_key','stripe_mode',
         'cookie_banner_aktiv','analytics_aktiv'
       )`
    );

    const settings = { ...DEFAULTS };
    for (const row of result.rows) {
      const key = row.schluessel as keyof SystemEinstellungen;
      if (key === "stripe_connect_enabled" || key === "cookie_banner_aktiv" || key === "analytics_aktiv") {
        (settings as Record<string, unknown>)[key] = row.wert === "true";
      } else if (key === "stripe_mode") {
        (settings as Record<string, unknown>)[key] = row.wert === "live" ? "live" : "test";
      } else if (key in DEFAULTS) {
        (settings as Record<string, unknown>)[key] = row.wert;
      }
    }

    cache = { value: settings, expires: Date.now() + CACHE_TTL_MS };
    return settings;
  } catch {
    return DEFAULTS;
  }
}

/** Eine System-Einstellung aktualisieren */
export async function systemEinstellungAktualisieren(
  schluessel: keyof SystemEinstellungen,
  wert:       string | number | boolean
): Promise<void> {
  await query(
    `UPDATE sebo.affiliate_einstellungen
     SET wert = $1, aktualisiert_am = now()
     WHERE schluessel = $2`,
    [String(wert), schluessel]
  );
  cache = null;
}

/** Bulk-Update */
export async function systemEinstellungenSpeichern(
  patches: Partial<SystemEinstellungen>
): Promise<void> {
  for (const [key, value] of Object.entries(patches)) {
    if (value !== undefined) {
      await systemEinstellungAktualisieren(
        key as keyof SystemEinstellungen,
        value as string | number | boolean
      );
    }
  }
  cache = null;
}
