import { query } from "./index";
import type { AffiliateEinstellungen } from "@/types/affiliate";

const DEFAULTS: AffiliateEinstellungen = {
  provision_ebene_1_prozent: 10,
  provision_ebene_2_prozent: 3,
  provision_ebene_3_prozent: 0,
  cookie_ttl_tage:           30,
  mindestauszahlung_cent:    2000,
  widerrufs_frist_tage:      14,
  registrierung_offen:       true,
  agb_aktuelle_version:      "1.0",
};

let cache: { value: AffiliateEinstellungen; expires: number } | null = null;
const CACHE_TTL_MS = 60_000;

/** Alle Einstellungen als typisiertes Objekt laden (mit 60s in-memory cache) */
export async function affiliateEinstellungenLaden(): Promise<AffiliateEinstellungen> {
  if (cache && cache.expires > Date.now()) return cache.value;

  try {
    const result = await query<{ schluessel: string; wert: string }>(
      `SELECT schluessel, wert FROM sebo.affiliate_einstellungen`
    );

    const settings = { ...DEFAULTS };
    for (const row of result.rows) {
      const key = row.schluessel as keyof AffiliateEinstellungen;
      if (key === "registrierung_offen") {
        (settings as Record<string, unknown>)[key] = row.wert === "true";
      } else if (key === "agb_aktuelle_version") {
        (settings as Record<string, unknown>)[key] = row.wert;
      } else if (key in DEFAULTS) {
        const num = parseFloat(row.wert);
        if (!isNaN(num)) (settings as Record<string, unknown>)[key] = num;
      }
    }

    cache = { value: settings, expires: Date.now() + CACHE_TTL_MS };
    return settings;
  } catch {
    return DEFAULTS;
  }
}

/** Eine Einstellung aktualisieren (Admin) */
export async function einstellungAktualisieren(
  schluessel: keyof AffiliateEinstellungen,
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
