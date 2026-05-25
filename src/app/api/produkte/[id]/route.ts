import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { produktById, produktAktualisieren, produktLoeschen } from "@/lib/db/produkte";
import { ProduktUpdateSchema } from "@/lib/utils/validierung";

// ---------------------------------------------------------------------------
// GET /api/produkte/[id]
// ---------------------------------------------------------------------------
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const produkt = await produktById(id);
    if (!produkt) {
      return NextResponse.json({ error: "Produkt nicht gefunden" }, { status: 404 });
    }
    return NextResponse.json(produkt);
  } catch (err) {
    console.error("[API GET /produkte/[id]]", err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PUT /api/produkte/[id]  (nur Admin)
// ---------------------------------------------------------------------------
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  try {
    const body   = await req.json();
    const parsed = ProduktUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const produkt = await produktAktualisieren(id, parsed.data);
    if (!produkt) {
      return NextResponse.json({ error: "Produkt nicht gefunden" }, { status: 404 });
    }
    return NextResponse.json(produkt);
  } catch (err) {
    console.error("[API PUT /produkte/[id]]", err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/produkte/[id]  (nur Admin)
// ---------------------------------------------------------------------------
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  try {
    const geloescht = await produktLoeschen(id);
    if (!geloescht) {
      return NextResponse.json({ error: "Produkt nicht gefunden" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[API DELETE /produkte/[id]]", err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
