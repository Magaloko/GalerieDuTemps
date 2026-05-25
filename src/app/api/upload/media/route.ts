import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { bildSpeichern } from "@/lib/storage/upload";

export const dynamic = "force-dynamic";

/**
 * Generischer Single-File-Uploader für Form-Felder.
 * Anders als /api/bilder: KEIN DB-Eintrag, nur Speichern + URL zurückgeben.
 * Der Caller setzt die URL dann in ein hidden field oder die Spalte ein.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file     = formData.get("datei") as File | null;
    if (!file) {
      return NextResponse.json({ error: "datei fehlt" }, { status: 400 });
    }

    const upload = await bildSpeichern(file);
    return NextResponse.json({
      url:          upload.url,
      dateiname:    upload.dateiname,
      dateigroesse: upload.dateigroesse,
      typ:          file.type,
      original:     file.name,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload fehlgeschlagen";
    console.error("[API POST /upload/media]", err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
