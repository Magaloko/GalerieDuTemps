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

  try {
    const [uebersicht, timeline, kategorien, zustand] = await Promise.all([
      uebersichtStats(),
      produktTimeline(30),
      kategorieVerteilung(),
      zustandVerteilung(),
    ]);

    return NextResponse.json({
      uebersicht,
      timeline,
      kategorien,
      zustand,
    });
  } catch (err) {
    console.error("[API /statistiken]", err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
