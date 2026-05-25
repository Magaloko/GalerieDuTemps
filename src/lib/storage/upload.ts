import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { randomUUID } from "crypto";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"];
const MAX_SIZE_MB   = 10;

export interface UploadResult {
  url:          string;
  dateigroesse: number;
  dateiname:    string;
}

/**
 * Speichert ein hochgeladenes Bild auf dem Dateisystem.
 * Dev:  ./public/uploads/  → URL: /uploads/...
 * Prod: UPLOAD_DIR         → URL: NEXT_PUBLIC_UPLOAD_URL/...
 */
export async function bildSpeichern(file: File): Promise<UploadResult> {
  // Validierung
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      `Ungültiger Dateityp: ${file.type}. Erlaubt: JPEG, PNG, WebP, AVIF`
    );
  }

  const maxBytes = MAX_SIZE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`Datei zu groß: max. ${MAX_SIZE_MB} MB erlaubt`);
  }

  // Verzeichnis bestimmen
  const uploadDir =
    process.env.UPLOAD_DIR ??
    join(process.cwd(), "public", "uploads");

  await mkdir(uploadDir, { recursive: true });

  // Eindeutiger Dateiname
  const ext       = extname(file.name) || `.${file.type.split("/")[1]}`;
  const dateiname = `${randomUUID()}${ext}`;
  const pfad      = join(uploadDir, dateiname);

  // Schreiben
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(pfad, buffer);

  // URL berechnen — relative URL ist domain-agnostisch und wird vom
  // /api/uploads-Route-Handler (via next.config rewrite) aus UPLOAD_DIR serviert.
  const baseUrl = (process.env.NEXT_PUBLIC_UPLOAD_URL || "/uploads").replace(/\/$/, "");
  const url     = `${baseUrl}/${dateiname}`;

  return {
    url,
    dateigroesse: file.size,
    dateiname,
  };
}

/** Löscht eine Datei aus dem Upload-Verzeichnis (Best-Effort) */
export async function bildLoeschenVonDisk(url: string): Promise<void> {
  try {
    const { unlink } = await import("fs/promises");
    const uploadDir  =
      process.env.UPLOAD_DIR ?? join(process.cwd(), "public", "uploads");
    const dateiname  = url.split("/").pop();
    if (!dateiname) return;
    await unlink(join(uploadDir, dateiname));
  } catch {
    // Fehler ignorieren (Datei evtl. bereits gelöscht)
  }
}
