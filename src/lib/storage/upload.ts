import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { supabaseStorageAktiv, supabaseUpload } from "./supabase-storage";

/* ──────────────────────────────────────────────────────────────────────────
 * Persistenz-Backend-Switch
 *
 * Wenn Supabase Storage konfiguriert (SUPABASE_URL + SERVICE_ROLE_KEY) →
 * Upload in den Bucket (dauerhaft, redundant, CDN). Sonst → lokales
 * Filesystem (Dev / Übergang). Object-Key-Schema: produkte/<uuid>/<name>.<ext>
 *
 * WICHTIG (Atomarität): persist() wirft bei Fehler → bildVerarbeiten bricht ab
 * BEVOR eine DB-Row geschrieben wird. So entstehen keine toten DB→Datei-Links.
 * ────────────────────────────────────────────────────────────────────────── */
const MIME_FOR_EXT: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  webp: "image/webp", avif: "image/avif",
};

async function persist(
  baseId: string,
  name:   string,   // "original" | "thumb" | "medium" | "large"
  ext:    string,
  buffer: Buffer,
): Promise<{ url: string; dateiname: string }> {
  const dateiname = name === "original" ? `${baseId}.${ext}` : `${baseId}-${name}.${ext}`;
  if (supabaseStorageAktiv()) {
    const key = `produkte/${baseId}/${name}.${ext}`;
    const url = await supabaseUpload(key, buffer, MIME_FOR_EXT[ext] ?? "application/octet-stream");
    return { url, dateiname };
  }
  // Fallback: Filesystem
  const dir = uploadDirGet();
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, dateiname), buffer);
  return { url: publicUrlFor(dateiname), dateiname };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Upload-Pipeline mit Bildverarbeitung (sharp)
 *
 * Was passiert pro Bild-Upload:
 *  1. EXIF auto-rotate (iPhone-Hochformat-Bug-Fix)
 *  2. EXIF strippen (Privacy: keine GPS-Daten leaken)
 *  3. 4 Varianten generieren parallel:
 *     - original  (komprimiert, gleiche Dimensionen, mozjpeg q=88)
 *     - thumb     (max 400px, WebP q=80, Galerie-Grid)
 *     - medium    (max 800px, WebP q=82, Produkt-Detail)
 *     - large     (max 1600px, WebP q=85, Zoom/Lightbox)
 *
 * Resultat:
 *   - iPhone HEIC (10MB) → ~1.2MB Original + 3 WebP-Varianten (40k/120k/350k)
 *   - Browser bekommt WebP (~70% kleiner als JPEG bei gleicher Qualität)
 *   - Mobile-Customers laden im Schnitt 80% weniger Bytes
 *
 * HEIC-Support: sharp kompiliert mit libheif fängt iPhone-Defaults ab und
 * konvertiert beim Upload nach WebP. Original-HEIC wird verworfen.
 *
 * PDFs und Videos werden ohne Bildverarbeitung gespeichert.
 * ────────────────────────────────────────────────────────────────────────── */

// ── Mime-Types & Größen-Limits ──────────────────────────────────────────────
const ALLOWED_IMAGE = [
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif",
  "image/heic", "image/heif",
];
const ALLOWED_VIDEO = ["video/mp4", "video/webm", "video/quicktime"];
const ALLOWED_DOC   = ["application/pdf"];
const ALLOWED_TYPES = [...ALLOWED_IMAGE, ...ALLOWED_VIDEO, ...ALLOWED_DOC];

const SIZE_LIMITS_MB: Record<string, number> = {
  image: 20,   // Original-Upload erlaubt — wird intern komprimiert
  video: 100,
  doc:   25,
};

function limitForType(mime: string): number {
  if (ALLOWED_IMAGE.includes(mime)) return SIZE_LIMITS_MB.image;
  if (ALLOWED_VIDEO.includes(mime)) return SIZE_LIMITS_MB.video;
  if (ALLOWED_DOC.includes(mime))   return SIZE_LIMITS_MB.doc;
  return SIZE_LIMITS_MB.image;
}

// ── Variant-Definitionen ────────────────────────────────────────────────────
type VariantDef = {
  name:    "thumb" | "medium" | "large";
  maxSide: number;
  quality: number;
};

const VARIANTS: VariantDef[] = [
  { name: "thumb",  maxSide: 400,  quality: 80 },
  { name: "medium", maxSide: 800,  quality: 82 },
  { name: "large",  maxSide: 1600, quality: 85 },
];

// ── Helper ──────────────────────────────────────────────────────────────────
function uploadDirGet(): string {
  return process.env.UPLOAD_DIR ?? join(process.cwd(), "public", "uploads");
}

function publicUrlFor(dateiname: string): string {
  const baseUrl = (process.env.NEXT_PUBLIC_UPLOAD_URL || "/uploads").replace(/\/$/, "");
  return `${baseUrl}/${dateiname}`;
}

// ── Public Types ────────────────────────────────────────────────────────────
export interface BildUploadResult {
  /** Original (komprimiert) — immer gesetzt */
  url:          string;
  url_thumb?:   string;   // 400px WebP
  url_medium?:  string;   // 800px WebP
  url_large?:   string;   // 1600px WebP
  format:       string;   // "jpeg" | "png" | "webp" | "heic" | "avif"
  breite:       number;
  hoehe:        number;
  dateigroesse: number;   // Bytes der Original-Datei nach Compression
  dateiname:    string;
}

export interface UploadResult {
  url:          string;
  dateigroesse: number;
  dateiname:    string;
}

// ── Bild-Pipeline (sharp) ───────────────────────────────────────────────────
/**
 * Verarbeitet ein hochgeladenes Bild durch die volle Pipeline:
 * Original komprimiert + 3 WebP-Varianten + Dimensionen + Format.
 */
export async function bildVerarbeiten(file: File): Promise<BildUploadResult> {
  if (!ALLOWED_IMAGE.includes(file.type)) {
    throw new Error(
      `Ungültiger Bild-Typ: ${file.type}. Erlaubt: JPEG/PNG/WebP/AVIF/HEIC`,
    );
  }

  const maxMb    = SIZE_LIMITS_MB.image;
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`Datei zu groß: max. ${maxMb} MB erlaubt`);
  }

  // Hinweis: Persistenz (Disk vs Supabase) übernimmt persist(). Beim
  // Filesystem-Fallback legt persist() das Verzeichnis selbst an.
  const buffer = Buffer.from(await file.arrayBuffer());
  const baseId = randomUUID();

  // Metadata lesen (Dimensionen, Format, Orientation)
  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch (err) {
    throw new Error(
      `Bild konnte nicht gelesen werden: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const origFormat = metadata.format ?? "unknown";

  // EXIF-orientiertes Sharp-Pipeline-Basis (rotate() auto-orientiert via EXIF,
  // strip() löscht Metadaten danach — Privacy + smaller).
  const basePipeline = () =>
    sharp(buffer)
      .rotate()                    // Auto-rotate basierend auf EXIF
      .withMetadata({ exif: {} }); // Strip alle EXIF-Daten

  // ── Original — komprimiert speichern ──────────────────────────────────────
  // HEIC/HEIF → konvertiere zu JPEG (Browser können HEIC nicht zuverlässig)
  // Andere Formate → behalte Format, aber komprimiere
  let origBuffer: Buffer;
  let origExt:    string;

  // sharp normalisiert HEIC → "heif" (HEIC ist nur ein Container, HEIF der Codec)
  if (origFormat === "heif" || file.type.includes("heic") || file.type.includes("heif")) {
    origBuffer = await basePipeline().jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    origExt    = "jpg";
  } else if (origFormat === "png") {
    origBuffer = await basePipeline().png({ compressionLevel: 9, palette: true }).toBuffer();
    origExt    = "png";
  } else if (origFormat === "webp") {
    origBuffer = await basePipeline().webp({ quality: 88 }).toBuffer();
    origExt    = "webp";
  } else if (origFormat === "avif") {
    origBuffer = await basePipeline().avif({ quality: 75 }).toBuffer();
    origExt    = "avif";
  } else {
    // JPEG + Default
    origBuffer = await basePipeline().jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    origExt    = "jpg";
  }

  // Final-Dimensionen NACH rotate() (kann breite ↔ hoehe drehen!)
  const finalMeta = await sharp(origBuffer).metadata();
  const breite    = finalMeta.width  ?? metadata.width  ?? 0;
  const hoehe     = finalMeta.height ?? metadata.height ?? 0;

  // ── Varianten-Buffer parallel generieren (im RAM) ─────────────────────────
  const variantBuffers = await Promise.all(
    VARIANTS.map(async (variant) => {
      const buf = await basePipeline()
        .resize({
          width:           variant.maxSide,
          height:          variant.maxSide,
          fit:             "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: variant.quality, effort: 4 })
        .toBuffer();
      return [variant.name, buf] as const;
    }),
  );

  // ── Persistieren: Original + Varianten ────────────────────────────────────
  // Original ZUERST (Hauptbild). Wenn das fehlschlägt → Exception, kein
  // weiterer Upload, keine DB-Row beim Caller. Atomar.
  const orig = await persist(baseId, "original", origExt, origBuffer);

  const variantPersisted = await Promise.all(
    variantBuffers.map(async ([name, buf]) => {
      const r = await persist(baseId, name, "webp", buf);
      return [name, r.url] as const;
    }),
  );
  const variantMap = Object.fromEntries(variantPersisted);

  return {
    url:          orig.url,
    url_thumb:    variantMap.thumb,
    url_medium:   variantMap.medium,
    url_large:    variantMap.large,
    format:       origFormat,
    breite,
    hoehe,
    dateigroesse: origBuffer.length,
    dateiname:    orig.dateiname,
  };
}

// ── Legacy: simples Speichern (für PDFs / Videos) ───────────────────────────
/**
 * Speichert eine Datei OHNE Bildverarbeitung (für PDFs, Videos, Dokumente).
 * Für Bilder bitte `bildVerarbeiten()` nutzen.
 */
export async function bildSpeichern(file: File): Promise<UploadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      `Ungültiger Dateityp: ${file.type}. Erlaubt: JPEG/PNG/WebP/AVIF/HEIC · MP4/WebM/MOV · PDF`,
    );
  }

  const maxMb    = limitForType(file.type);
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`Datei zu groß: max. ${maxMb} MB erlaubt`);
  }

  // Wenn's ein Bild ist → durch die Pipeline schicken (volle Varianten)
  if (ALLOWED_IMAGE.includes(file.type)) {
    const r = await bildVerarbeiten(file);
    return { url: r.url, dateigroesse: r.dateigroesse, dateiname: r.dateiname };
  }

  // Sonst: 1:1 schreiben
  const dir       = uploadDirGet();
  await mkdir(dir, { recursive: true });
  const ext       = extname(file.name) || `.${file.type.split("/")[1]}`;
  const dateiname = `${randomUUID()}${ext}`;
  const pfad      = join(dir, dateiname);
  const buffer    = Buffer.from(await file.arrayBuffer());
  await writeFile(pfad, buffer);

  return {
    url:          publicUrlFor(dateiname),
    dateigroesse: file.size,
    dateiname,
  };
}

// ── Bild von Disk löschen (inkl. Varianten) ─────────────────────────────────
/**
 * Löscht eine Datei + ihre Varianten aus dem Upload-Verzeichnis.
 * Best-Effort — Fehler werden geloggt, nie geworfen.
 */
export async function bildLoeschenVonDisk(url: string): Promise<void> {
  // ── Supabase-Storage-Pfad ────────────────────────────────────────────────
  // URL-Schema: .../object/public/<bucket>/produkte/<uuid>/<name>.<ext>
  // → lösche alle 4 Varianten unter dem produkte/<uuid>/ Prefix.
  if (url.includes("/storage/v1/object/public/")) {
    const { extractObjectKey, supabaseDelete } = await import("./supabase-storage");
    const key = extractObjectKey(url);
    if (key) {
      // key = produkte/<uuid>/<name>.<ext> → Prefix produkte/<uuid>/
      const prefix = key.replace(/\/[^/]+$/, "");
      await supabaseDelete([
        `${prefix}/original.jpg`, `${prefix}/original.png`,
        `${prefix}/original.webp`, `${prefix}/original.avif`,
        `${prefix}/thumb.webp`, `${prefix}/medium.webp`, `${prefix}/large.webp`,
      ]);
    }
    return;
  }

  // ── Filesystem-Pfad (Fallback / Legacy) ──────────────────────────────────
  const { unlink } = await import("fs/promises");
  const dir        = uploadDirGet();
  const dateiname  = url.split("/").pop();
  if (!dateiname) return;

  const baseId = dateiname.replace(/\.[^.]+$/, "");
  const kandidaten = [
    dateiname,
    `${baseId}-thumb.webp`,
    `${baseId}-medium.webp`,
    `${baseId}-large.webp`,
  ];

  await Promise.allSettled(
    kandidaten.map(name => unlink(join(dir, name))),
  );
}
