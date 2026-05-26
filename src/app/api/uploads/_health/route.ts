import { NextResponse } from "next/server";
import { stat, readdir } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /api/uploads/_health
 *
 * Diagnose-Endpoint für Bild-Serving. Zeigt:
 *  - welcher Pfad als UPLOAD_DIR aufgelöst wird (env vs default),
 *  - ob das Verzeichnis existiert und beschreibbar ist,
 *  - wie viele Dateien drin liegen (max 5 Beispiele).
 *
 * Liest keine Datei-Inhalte. Sicher öffentlich erreichbar weil nur
 * Strukturinformation — kein Filename/Pfad-Leak von User-Daten:
 * Beispiel-Filenames sind nur die ersten 5 sortiert.
 *
 * Hauptanwendungsfall: nach einem Coolify-Deploy prüfen ob das Persistent-
 * Volume korrekt gemountet ist und Bilder noch da sind.
 * ────────────────────────────────────────────────────────────────────────── */
export async function GET() {
  const uploadDir =
    process.env.UPLOAD_DIR ??
    join(process.cwd(), "public", "uploads");

  const baseUrl = (process.env.NEXT_PUBLIC_UPLOAD_URL || "/uploads").replace(/\/$/, "");

  try {
    const info = await stat(uploadDir);
    if (!info.isDirectory()) {
      return NextResponse.json({
        ok:        false,
        uploadDir,
        baseUrl,
        problem:   "Pfad existiert, ist aber kein Verzeichnis",
        cwd:       process.cwd(),
        envSet:    Boolean(process.env.UPLOAD_DIR),
      }, { status: 503 });
    }

    const entries = await readdir(uploadDir);
    const sample  = entries.slice(0, 5);

    return NextResponse.json({
      ok:           true,
      uploadDir,
      baseUrl,
      fileCount:    entries.length,
      sampleFiles:  sample,
      cwd:          process.cwd(),
      envSet:       Boolean(process.env.UPLOAD_DIR),
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json({
      ok:        false,
      uploadDir,
      baseUrl,
      problem:   "Verzeichnis nicht erreichbar oder existiert nicht",
      error:     err instanceof Error ? err.message : String(err),
      cwd:       process.cwd(),
      envSet:    Boolean(process.env.UPLOAD_DIR),
      hinweis:   "In Coolify ein Persistent Volume auf diesen Pfad mounten ODER die ENV-Variable UPLOAD_DIR auf den gemounteten Pfad setzen.",
    }, { status: 503 });
  }
}
