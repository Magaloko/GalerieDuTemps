/**
 * Globale Kontakt-Kanäle (WhatsApp, Telegram, Instagram).
 * Werte liegen in sebo.affiliate_einstellungen (key/value-Store).
 * 60-Sekunden In-Memory-Cache, weil das auf JEDER Seite (Footer) gerendert wird.
 */
import { query } from "./index";

export interface KontaktKanaele {
  whatsapp_nummer:  string;   // E.164 ohne führendes "+", z.B. "77011234567"
  telegram_channel: string;   // ohne @, z.B. "galeriedutemps"
  instagram_handle: string;   // ohne @, z.B. "galeriedutemps_"
}

const DEFAULTS: KontaktKanaele = {
  whatsapp_nummer:  "",
  telegram_channel: "",
  instagram_handle: "galeriedutemps_",
};

let cache: { value: KontaktKanaele; expires: number } | null = null;
const CACHE_TTL_MS = 60_000;

export async function kontaktKanaeleLaden(): Promise<KontaktKanaele> {
  if (cache && cache.expires > Date.now()) return cache.value;

  try {
    const res = await query<{ schluessel: string; wert: string }>(
      `SELECT schluessel, wert
         FROM sebo.affiliate_einstellungen
        WHERE schluessel IN ('whatsapp_nummer','telegram_channel','instagram_handle')`
    );
    const out = { ...DEFAULTS };
    for (const row of res.rows) {
      const k = row.schluessel as keyof KontaktKanaele;
      if (k in out) out[k] = (row.wert ?? "").trim();
    }
    cache = { value: out, expires: Date.now() + CACHE_TTL_MS };
    return out;
  } catch {
    return DEFAULTS;
  }
}

/** Sichere WhatsApp-Click-URL: https://wa.me/<digits> */
export function whatsappUrl(nummer: string): string | null {
  const digits = nummer.replace(/\D/g, "");
  return digits.length >= 9 ? `https://wa.me/${digits}` : null;
}

/** Sichere Telegram-URL: https://t.me/<channel> */
export function telegramUrl(channel: string): string | null {
  const clean = channel.replace(/^@/, "").trim();
  return clean.length > 0 ? `https://t.me/${clean}` : null;
}

/** Sichere Instagram-URL */
export function instagramUrl(handle: string): string | null {
  const clean = handle.replace(/^@/, "").trim();
  return clean.length > 0 ? `https://instagram.com/${clean}` : null;
}
