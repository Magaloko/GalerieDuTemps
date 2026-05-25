import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { zertifikatEinfuegen } from "@/lib/db/produkt-medien";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.produkt_id || !body.url || !body.name) {
      return NextResponse.json({ error: "produkt_id, url, name erforderlich" }, { status: 400 });
    }
    const z = await zertifikatEinfuegen({
      produkt_id: body.produkt_id,
      url:        body.url,
      name:       body.name,
      aussteller: body.aussteller ?? undefined,
      datum:      body.datum      ?? undefined,
    });
    return NextResponse.json(z, { status: 201 });
  } catch (err) {
    console.error("[API POST /produkt-zertifikate]", err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
