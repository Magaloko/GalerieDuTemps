import { NextResponse } from "next/server";
import { alleWechselkurse } from "@/lib/db/wechselkurse";

// ISR: Route ist rein öffentlich (keine cookies/headers/searchParams),
// daher kein force-dynamic — Next.js cacht die Antwort und revalidiert alle 5 min.
export const revalidate = 300;

/** Public-readable: Wechselkurse für Frontend (Form-Preview, Multi-Currency-Anzeige) */
export async function GET() {
  const kurse = await alleWechselkurse();
  // Nur Public-Felder exposen (kein Audit-Detail nötig)
  return NextResponse.json({
    kurse: kurse.map(k => ({
      waehrung:    k.waehrung,
      name:        k.name,
      symbol:      k.symbol,
      rate_to_kzt: k.rate_to_kzt,
    })),
    aktualisiert_am: kurse[0]?.aktualisiert_am,
  });
}
