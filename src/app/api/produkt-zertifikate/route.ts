import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/config";
import { zertifikatEinfuegen } from "@/lib/db/produkt-medien";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Нет прав" }, { status: 403 });

  try {
    const body = await req.json();
    if (!body.produkt_id || !body.url || !body.name) {
      return NextResponse.json({ error: "produkt_id, url, name erforderlich" }, { status: 400 });
    }
    const url = String(body.url);
    const ok = url.startsWith("/uploads/")
            || /^https?:\/\/[^/]*(galeriedutemps\.kz|apps\.dadakaev\.tech)/.test(url);
    if (!ok) return NextResponse.json({ error: "URL nicht erlaubt" }, { status: 400 });

    const z = await zertifikatEinfuegen({
      produkt_id: body.produkt_id,
      url,
      name:       String(body.name).slice(0, 200),
      aussteller: body.aussteller ? String(body.aussteller).slice(0,100) : undefined,
      datum:      body.datum      ?? undefined,
    });
    return NextResponse.json(z, { status: 201 });
  } catch (err) {
    console.error("[API POST /produkt-zertifikate]", err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
