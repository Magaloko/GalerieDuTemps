import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/config";
import {
  bildLoeschen,
  bilderSortierungAktualisieren,
  hauptbildSetzen,
  bildAltTextUpdate,
} from "@/lib/db/bilder";
import { bildLoeschenVonDisk } from "@/lib/storage/upload";

// ---------------------------------------------------------------------------
// DELETE /api/bilder/[id]
// ---------------------------------------------------------------------------
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Нет прав" }, { status: 403 });

  const { id } = await params;
  try {
    const bild = await bildLoeschen(id);
    if (!bild) {
      return NextResponse.json({ error: "Bild nicht gefunden" }, { status: 404 });
    }
    // Datei von Disk löschen (Best-Effort)
    await bildLoeschenVonDisk(bild.url);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[API DELETE /bilder/[id]]", err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/bilder/[id]  – Sortierung oder Hauptbild ändern
// ---------------------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Нет прав" }, { status: 403 });

  const { id }  = await params;
  const body    = await req.json();

  try {
    // Hauptbild setzen
    if (body.ist_hauptbild === true && body.produkt_id) {
      await hauptbildSetzen(id, body.produkt_id);
    }

    // Sortierung aktualisieren (Array mit {id, sortierung})
    if (Array.isArray(body.sortierungen)) {
      await bilderSortierungAktualisieren(body.sortierungen);
    }

    // Alt-Text Inline-Edit
    if (typeof body.alt_text === "string") {
      await bildAltTextUpdate(id, body.alt_text);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API PATCH /bilder/[id]]", err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
