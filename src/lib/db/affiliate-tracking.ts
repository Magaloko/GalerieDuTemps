import { query } from "./index";
import type { AffiliateAttribution } from "@/types/affiliate";

// ---------------------------------------------------------------------------
// Klick einfügen (fire-and-forget, sollte gequeued aufgerufen werden)
// ---------------------------------------------------------------------------
export async function klickLoggen(data: {
  referral_code: string;
  affiliate_id:  string | null;
  ip_hash:       string | null;
  ua_hash:       string | null;
  referer:       string | null;
  landing_url:   string | null;
  user_agent:    string | null;
  ist_bot:       boolean;
}): Promise<number | null> {
  try {
    const result = await query<{ id: number }>(
      `INSERT INTO sebo.affiliate_klicks
         (referral_code, affiliate_id, ip_hash, ua_hash, referer, landing_url, user_agent, ist_bot)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id`,
      [
        data.referral_code.toUpperCase(),
        data.affiliate_id,
        data.ip_hash,
        data.ua_hash,
        data.referer,
        data.landing_url,
        data.user_agent,
        data.ist_bot,
      ]
    );
    return result.rows[0]?.id ?? null;
  } catch (err) {
    console.error("[affiliate-tracking] klickLoggen:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Attribution beim Kontaktformular-Submit anlegen
// ---------------------------------------------------------------------------
export async function attributionAnlegen(data: {
  kontaktanfrage_id:      string;
  affiliate_id:           string;
  referral_code_snapshot: string;
  klick_id:               number | null;
  ip_hash:                string | null;
  ua_hash:                string | null;
  flag_verdaechtig:       boolean;
}): Promise<AffiliateAttribution | null> {
  try {
    const result = await query<AffiliateAttribution>(
      `INSERT INTO sebo.affiliate_attributionen
         (kontaktanfrage_id, affiliate_id, referral_code_snapshot, klick_id,
          ip_hash, ua_hash, flag_verdaechtig)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (kontaktanfrage_id) DO NOTHING
       RETURNING *`,
      [
        data.kontaktanfrage_id,
        data.affiliate_id,
        data.referral_code_snapshot.toUpperCase(),
        data.klick_id,
        data.ip_hash,
        data.ua_hash,
        data.flag_verdaechtig,
      ]
    );
    return result.rows[0] ?? null;
  } catch (err) {
    console.error("[affiliate-tracking] attributionAnlegen:", err);
    return null;
  }
}

/** Attribution für eine Kontaktanfrage laden */
export async function attributionByKontaktanfrage(
  kontaktanfrageId: string
): Promise<AffiliateAttribution | null> {
  const result = await query<AffiliateAttribution>(
    `SELECT * FROM sebo.affiliate_attributionen WHERE kontaktanfrage_id = $1`,
    [kontaktanfrageId]
  );
  return result.rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Klick-Statistiken
// ---------------------------------------------------------------------------
export interface KlickStats {
  gesamt:      number;
  letzte_30:   number;
  letzte_7:    number;
  heute:       number;
  bots:        number;
}

export async function klickStatsFuerAffiliate(affiliateId: string): Promise<KlickStats> {
  const result = await query<KlickStats>(
    `SELECT
       COUNT(*)::int FILTER (WHERE NOT ist_bot)                                            AS gesamt,
       COUNT(*)::int FILTER (WHERE NOT ist_bot AND erstellt_am > now() - interval '30 days') AS letzte_30,
       COUNT(*)::int FILTER (WHERE NOT ist_bot AND erstellt_am > now() - interval '7 days')  AS letzte_7,
       COUNT(*)::int FILTER (WHERE NOT ist_bot AND erstellt_am::date = CURRENT_DATE)         AS heute,
       COUNT(*)::int FILTER (WHERE ist_bot)                                                AS bots
     FROM sebo.affiliate_klicks
     WHERE affiliate_id = $1`,
    [affiliateId]
  );
  return result.rows[0] ?? { gesamt: 0, letzte_30: 0, letzte_7: 0, heute: 0, bots: 0 };
}

/** Klicks-Timeline für Affiliate-Dashboard (letzte N Tage) */
export interface KlickTimelineEintrag {
  datum:  string;
  klicks: number;
}

export async function klickTimeline(
  affiliateId: string,
  tage = 30
): Promise<KlickTimelineEintrag[]> {
  const result = await query<KlickTimelineEintrag>(
    `WITH RECURSIVE dates AS (
       SELECT CURRENT_DATE - $1::int + 1 AS datum
       UNION ALL
       SELECT datum + INTERVAL '1 day' FROM dates WHERE datum < CURRENT_DATE
     )
     SELECT
       to_char(d.datum, 'YYYY-MM-DD') AS datum,
       COUNT(k.id)::int FILTER (WHERE NOT k.ist_bot) AS klicks
     FROM dates d
     LEFT JOIN sebo.affiliate_klicks k
       ON DATE(k.erstellt_am) = d.datum AND k.affiliate_id = $2
     GROUP BY d.datum
     ORDER BY d.datum`,
    [tage, affiliateId]
  );
  return result.rows;
}

/** Cleanup: alte Klicks löschen (für Cron-Job) */
export async function alteKlicksLoeschen(behalteTage = 90): Promise<number> {
  const result = await query(
    `DELETE FROM sebo.affiliate_klicks
     WHERE erstellt_am < now() - ($1 || ' days')::interval`,
    [behalteTage]
  );
  return result.rowCount ?? 0;
}
