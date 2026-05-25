import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { rateLimitPruefen, getClientIp, tooManyRequestsResponse } from "@/lib/utils/rate-limit";
import type { ProduktListItem } from "@/types/produkt";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Rate-Limit: 60 Suchanfragen / Minute / IP
  const ip = getClientIp(req);
  const rl = rateLimitPruefen(`suche:${ip}`, 60, 60 * 1000);
  if (!rl.erlaubt) return tooManyRequestsResponse(rl) as unknown as NextResponse;

  const q = req.nextUrl.searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ items: [], gesamt: 0 });
  }

  try {
    const result = await query<ProduktListItem & { relevanz: number }>(
      `SELECT
         p.id, p.name, p.slug, p.preis, p.originalpreis,
         k.name AS kategorie_name, p.zustand, p.era,
         p.lagerbestand, p.verkauft, p.featured, p.erstellt_am,
         (SELECT pb.url FROM sebo.produktbilder pb
          WHERE pb.produkt_id = p.id AND pb.ist_hauptbild = true LIMIT 1)
          AS hauptbild_url,
         ts_rank(
           to_tsvector('simple',
             coalesce(p.name,'') || ' ' ||
             coalesce(p.beschreibung,'') || ' ' ||
             coalesce(p.era,'') || ' ' ||
             coalesce(p.herkunft,'') || ' ' ||
             coalesce(p.material,'')
           ),
           plainto_tsquery('simple', $1)
         ) AS relevanz
       FROM sebo.produkte p
       LEFT JOIN sebo.kategorien k ON k.id = p.kategorie_id
       WHERE
         p.lagerbestand > 0
         AND p.verkauft = false
         AND p.veroeffentlicht_am IS NOT NULL
         AND to_tsvector('simple',
               coalesce(p.name,'') || ' ' || coalesce(p.beschreibung,'') || ' ' ||
               coalesce(p.era,'') || ' ' || coalesce(p.herkunft,'') || ' ' ||
               coalesce(p.material,'')
             ) @@ plainto_tsquery('simple', $1)
       ORDER BY relevanz DESC, p.featured DESC
       LIMIT 20`,
      [q]
    );

    return NextResponse.json({
      items:  result.rows,
      gesamt: result.rowCount ?? 0,
      query:  q,
    });
  } catch (err) {
    console.error("[API /suche]", err);
    return NextResponse.json({ error: "Suchfehler" }, { status: 500 });
  }
}
