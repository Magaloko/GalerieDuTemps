import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/config";
import { bildSpeichern } from "@/lib/storage/upload";
import { bildEinfuegen, bilderFuerProdukt } from "@/lib/db/bilder";
import { rateLimitPruefen, getClientIp, tooManyRequestsResponse } from "@/lib/utils/rate-limit";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// POST /api/bilder  – Bild hochladen (nur Admin)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Нет прав" }, { status: 403 });

  // Rate-Limit: 60 Uploads/Stunde/Admin
  const ip = getClientIp(req);
  const rl = rateLimitPruefen(`upload:${session.user.id}:${ip}`, 60, 60 * 60 * 1000);
  if (!rl.erlaubt) return tooManyRequestsResponse(rl);

  try {
    const formData  = await req.formData();
    const file      = formData.get("datei") as File | null;
    const produktId = formData.get("produkt_id") as string | null;
    const altText   = formData.get("alt_text") as string | null;

    if (!file || !produktId) {
      return NextResponse.json(
        { error: "datei und produkt_id sind erforderlich" },
        { status: 400 }
      );
    }

    // Prüfen ob das erste Bild (→ wird Hauptbild)
    const vorhandene = await bilderFuerProdukt(produktId);
    const istHauptbild = vorhandene.length === 0;

    // Datei speichern
    const upload = await bildSpeichern(file);

    // In DB eintragen
    const bild = await bildEinfuegen({
      produkt_id:    produktId,
      url:           upload.url,
      alt_text:      altText ?? undefined,
      ist_hauptbild: istHauptbild,
      dateigroesse:  upload.dateigroesse,
    });

    return NextResponse.json(bild, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload fehlgeschlagen";
    console.error("[API POST /bilder]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
