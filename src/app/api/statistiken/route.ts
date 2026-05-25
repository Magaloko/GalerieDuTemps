import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import {
  uebersichtStats,
  produktTimeline,
  kategorieVerteilung,
  zustandVerteilung,
} from "@/lib/db/statistiken";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  // Jede Query einzeln, damit ein Fehler in einer nicht alle abreißt
  // und wir die genaue Quelle sehen.
  const results = await Promise.allSettled([
    uebersichtStats(),
    produktTimeline(30),
    kategorieVerteilung(),
    zustandVerteilung(),
  ]);

  const [uebersichtR, timelineR, kategorienR, zustandR] = results;

  return NextResponse.json({
    uebersicht: uebersichtR.status === "fulfilled" ? uebersichtR.value
               : { error: String(uebersichtR.reason?.message ?? uebersichtR.reason) },
    timeline:   timelineR.status === "fulfilled" ? timelineR.value
               : { error: String(timelineR.reason?.message ?? timelineR.reason) },
    kategorien: kategorienR.status === "fulfilled" ? kategorienR.value
               : { error: String(kategorienR.reason?.message ?? kategorienR.reason) },
    zustand:    zustandR.status === "fulfilled" ? zustandR.value
               : { error: String(zustandR.reason?.message ?? zustandR.reason) },
  });
}
