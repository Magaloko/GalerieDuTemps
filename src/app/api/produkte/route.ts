import { NextRequest, NextResponse } from "next/server";
import { auth, requireAdminSession } from "@/lib/auth/config";
import { produkteListe, produktErstellen } from "@/lib/db/produkte";
import { katalogProdukte } from "@/lib/db/produkte-public";
import { ProduktCreateSchema, PaginierungSchema } from "@/lib/utils/validierung";

export const dynamic = "force-dynamic";

const ADMIN_ROLLEN = new Set(["admin", "superadmin"]);

// ---------------------------------------------------------------------------
// GET /api/produkte
//  - Ohne Admin-Auth: öffentliche Liste (nur veröffentlichte, ohne interne Felder)
//  - Mit Admin-Auth: vollständige Liste inkl. inaktiver + intener Felder
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const sp     = req.nextUrl.searchParams;
    const parsed = PaginierungSchema.safeParse(Object.fromEntries(sp));

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const session = await auth();
    const istAdmin = session && ADMIN_ROLLEN.has(session.user?.role ?? "");

    if (istAdmin) {
      const daten = await produkteListe(parsed.data);
      return NextResponse.json(daten);
    }

    // Public: nur whitelistede Felder, nur veröffentlicht + aktiv
    const data = await katalogProdukte({
      seite:      parsed.data.seite,
      limit:      parsed.data.limit,
      suche:      parsed.data.suche,
      kategorie:  parsed.data.kategorie,
      zustand:    parsed.data.zustand,
      sortierung: parsed.data.sortierung === "preis_asc"  ? "preis_asc"
                : parsed.data.sortierung === "preis_desc" ? "preis_desc"
                : parsed.data.sortierung === "name"       ? "name"
                : "neu",
    });
    const safe = {
      items: data.items.map(p => ({
        id:             p.id,
        name:           p.name,
        slug:           p.slug,
        preis:          p.preis,
        originalpreis:  p.originalpreis,
        kategorie_name: p.kategorie_name,
        zustand:        p.zustand,
        featured:       p.featured,
        b2c_mode:       p.b2c_mode === "teaser" ? "teaser" : undefined,
        hauptbild_url:  p.hauptbild_url,
      })),
      gesamt: data.gesamt,
      seite:  data.seite,
      seiten: data.seiten,
    };
    return NextResponse.json(safe);
  } catch (err) {
    console.error("[API GET /produkte]", err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/produkte  – Produkt erstellen (nur Admin)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Нет прав" }, { status: 403 });
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
