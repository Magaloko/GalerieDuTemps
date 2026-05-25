import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { produkteListe, produktErstellen } from "@/lib/db/produkte";
import { ProduktCreateSchema, PaginierungSchema } from "@/lib/utils/validierung";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/produkte  – Liste mit Paginierung (öffentlich lesbar)
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const sp     = req.nextUrl.searchParams;
    const parsed = PaginierungSchema.safeParse(Object.fromEntries(sp));

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const daten = await produkteListe(parsed.data);
    return NextResponse.json(daten);
  } catch (err) {
    console.error("[API GET /produkte]", err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/produkte  – Produkt erstellen (nur Admin)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  try {
    const body   = await req.json();
    const parsed = ProduktCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const produkt = await produktErstellen(parsed.data, session.user.id);
    return NextResponse.json(produkt, { status: 201 });
  } catch (err) {
    console.error("[API POST /produkte]", err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
