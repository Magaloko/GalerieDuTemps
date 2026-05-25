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

  // allSettled: ein Query-Fehler reißt nicht alle anderen ab
  const [u, t, k, z] = await Promise.allSettled([
    uebersichtStats(),
    produktTimeline(30),
    kategorieVerteilung(),
    zustandVerteilung(),
  ]);

  const errors: Record<string, string> = {};
  if (u.status === "rejected") errors.uebersicht = String(u.reason?.message ?? u.reason);
  if (t.status === "rejected") errors.timeline   = String(t.reason?.message ?? t.reason);
  if (k.status === "rejected") errors.kategorien = String(k.reason?.message ?? k.reason);
  if (z.status === "rejected") errors.zustand    = String(z.reason?.message ?? z.reason);

  return NextResponse.json({
    uebersicht: u.status === "fulfilled" ? u.value : null,
    timeline:   t.status === "fulfilled" ? t.value : [],
    kategorien: k.status === "fulfilled" ? k.value : [],
    zustand:    z.status === "fulfilled" ? z.value : [],
    ...(Object.keys(errors).length > 0 ? { errors } : {}),
  });
}
