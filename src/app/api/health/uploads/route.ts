import { NextResponse } from "next/server";
import { stat, readdir } from "fs/promises";
import { join } from "path";
import { requireAdminSession } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /api/health/uploads — Admin-only Diagnose-Endpoint
 *
 * Zeigt: aufgelösten UPLOAD_DIR, Existenz-Check, File-Count, Sample-Files.
 * Hauptanwendungsfall: nach Coolify-Deploy prüfen ob Persistent-Volume
 * gemountet ist.
 *
 * Security: Path + Filenames sind Recon-relevant — Admin-Auth required.
 * (Vorher public — Codex-Audit MED-1 verlangte Schutz.)
 * ────────────────────────────────────────────────────────────────────────── */
export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Нет прав" }, { status: 403 });
  }

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
