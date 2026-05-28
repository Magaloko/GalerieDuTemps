import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { query } from "@/lib/db";
import { supabaseStorageAktiv, supabaseUpload } from "./supabase-storage";

/* ──────────────────────────────────────────────────────────────────────────
 * Migration lokaler /uploads-Bilder → Supabase Storage (server-seitig).
 *
 * Wird vom Admin-Endpoint /api/admin/migrate-images aufgerufen (kein Shell-
 * Command nötig). Läuft IM Container → hat Zugriff auf das Upload-Volume,
 * die DB und die Supabase-Env.
 *
 * Idempotent: überspringt Bilder die bereits Supabase-URLs haben. Fehlt eine
 * Datei auf der Disk (z.B. durch früheren Rebuild verloren), wird sie als
 * „missing" gezählt, ohne abzubrechen.
 * ────────────────────────────────────────────────────────────────────────── */

const MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  webp: "image/webp", avif: "image/avif",
};

function uploadDir(): string {
  return process.env.UPLOAD_DIR ?? join(process.cwd(), "public", "uploads");
}
function isSupabase(u: string | null): boolean {
  return !!u && u.includes("/storage/v1/object/public/");
}
function isLocal(u: string | null): boolean {
  return !!u && u.includes("/uploads/");
}
function fileFor(url: string): string | null {
  const name = url.split("/").pop();
  return name ? join(uploadDir(), name) : null;
}
async function tryRead(url: string): Promise<Buffer | null> {
  const p = fileFor(url);
  if (!p) return null;
  try { return await readFile(p); } catch { return null; }
}

export interface MigrateImagesResult {
  ok:        boolean;
  migrated:  number;
  skipped:   number;
  missing:   number;
  total:     number;
  dryRun:    boolean;
  error?:    string;
}

export async function migrateLocalImagesToSupabase(
  opts?: { dryRun?: boolean },
): Promise<MigrateImagesResult> {
  const dryRun = opts?.dryRun ?? false;

  if (!supabaseStorageAktiv()) {
    return { ok: false, migrated: 0, skipped: 0, missing: 0, total: 0, dryRun,
      error: "Supabase Storage nicht konfiguriert (SUPABASE_URL / SERVICE_ROLE_KEY / bucket)." };
  }

  const { rows } = await query<{
    id: string; produkt_id: string;
    url: string; url_thumb: string | null; url_medium: string | null; url_large: string | null;
  }>(
    `SELECT id, produkt_id, url, url_thumb, url_medium, url_large
     FROM sebo.produktbilder ORDER BY erstellt_am`,
  );

  let migrated = 0, skipped = 0, missing = 0;

  for (const row of rows) {
    if (isSupabase(row.url)) { skipped++; continue; }
    if (!isLocal(row.url))   { skipped++; continue; }  // externe URL → lassen

    const ext = (row.url.split(".").pop() || "jpg").toLowerCase();
    const variants: Array<[string, string, string | null]> = [
      ["original", ext,    row.url],
      ["thumb",    "webp", row.url_thumb],
      ["medium",   "webp", row.url_medium],
      ["large",    "webp", row.url_large],
    ];

    const neu: Record<string, string> = {};
    let okOriginal = false;
    for (const [name, vext, vurl] of variants) {
      if (!vurl) continue;
      const buf = await tryRead(vurl);
      if (!buf) { if (name === "original") missing++; continue; }
      if (dryRun) {
        neu[name] = `(dry-run) produkte/${row.produkt_id}/${name}.${vext}`;
        if (name === "original") okOriginal = true;
        continue;
      }
      try {
        const url = await supabaseUpload(
          `produkte/${row.produkt_id}/${name}.${vext}`,
          buf,
          MIME[vext] ?? "application/octet-stream",
        );
        neu[name] = url;
        if (name === "original") okOriginal = true;
      } catch (e) {
        console.error(`[migrate-images] ${row.id} ${name}:`, e);
      }
    }

    if (!okOriginal) { missing++; continue; }

    if (!dryRun) {
      await query(
        `UPDATE sebo.produktbilder SET url=$1, url_thumb=$2, url_medium=$3, url_large=$4 WHERE id=$5`,
        [neu.original, neu.thumb ?? null, neu.medium ?? null, neu.large ?? null, row.id],
      );
      await query(
        `UPDATE sebo.produkte SET hauptbild_url=$1 WHERE id=$2 AND hauptbild_url=$3`,
        [neu.original, row.produkt_id, row.url],
      );
    }
    migrated++;
  }

  return { ok: true, migrated, skipped, missing, total: rows.length, dryRun };
}
