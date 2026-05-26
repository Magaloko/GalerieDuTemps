import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/config";
import { dateiEinfuegen } from "@/lib/db/produkt-medien";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Нет прав" }, { status: 403 });

  try {
    const body = await req.json();
    if (!body.produkt_id || !body.url || !body.name) {
      return NextResponse.json({ error: "produkt_id, url, name erforderlich" }, { status: 400 });
    }
    // URL-Validation: nur relative (/uploads/...) oder eigene Domain erlauben.
    const url = String(body.url);
    const ok = url.startsWith("/uploads/")
            || /^https?:\/\/[^/]*(galeriedutemps\.kz|apps\.dadakaev\.tech)/.test(url);
    if (!ok) return NextResponse.json({ error: "URL nicht erlaubt" }, { status: 400 });

    const datei = await dateiEinfuegen({
      produkt_id:   body.produkt_id,
      url,
      name:         String(body.name).slice(0, 200),
      dateigroesse: body.dateigroesse ?? undefined,
    });
    return NextResponse.json(datei, { status: 201 });
  } catch (err) {
    console.error("[API POST /produkt-dateien]", err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
