import { NextResponse } from "next/server";
import { alleKategorien } from "@/lib/db/kategorien";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const kategorien = await alleKategorien();
    return NextResponse.json(kategorien);
  } catch (err) {
    console.error("[API /kategorien]", err);
    return NextResponse.json({ error: "Fehler beim Laden der Kategorien" }, { status: 500 });
  }
}
