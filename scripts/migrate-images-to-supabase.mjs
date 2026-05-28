#!/usr/bin/env node
/**
 * Migriert bestehende Produkt-Bilder vom lokalen Filesystem (/uploads-Volume)
 * nach Supabase Storage und aktualisiert die DB-URLs.
 *
 * Sicher: idempotent (überspringt schon migrierte Supabase-URLs), Dry-Run,
 * überspringt fehlende Dateien ohne Abbruch.
 *
 * Verwendung (im Container via Coolify Execute Command — hat alle ENV):
 *   node scripts/migrate-images-to-supabase.mjs --dry-run   # nur zeigen
 *   node scripts/migrate-images-to-supabase.mjs             # migrieren
 *
 * Voraussetzungen (ENV):
 *   DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   SUPABASE_STORAGE_BUCKET (default "produktbilder"),
 *   UPLOAD_DIR (wo die alten Dateien liegen, default /app/public/uploads)
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";

const dryRun = process.argv.includes("--dry-run");

const {
  DATABASE_URL,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_STORAGE_BUCKET = "produktbilder",
  UPLOAD_DIR = "/app/public/uploads",
} = process.env;

if (!DATABASE_URL)               { console.error("✗ DATABASE_URL fehlt"); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) { console.error("✗ SUPABASE_URL / SERVICE_ROLE_KEY fehlt"); process.exit(1); }

const MIME = { jpg:"image/jpeg", jpeg:"image/jpeg", png:"image/png", webp:"image/webp", avif:"image/avif" };
const isSupabase = (u) => typeof u === "string" && u.includes("/storage/v1/object/public/");
const isLocal    = (u) => typeof u === "string" && (u.startsWith("/uploads/") || u.includes("/uploads/"));

function fileFor(url) {
  // /uploads/<name> → UPLOAD_DIR/<name>
  const name = url.split("/").pop();
  return name ? join(UPLOAD_DIR, name) : null;
}

async function uploadOne(produktUuid, variantName, ext, buf) {
  const key = `produkte/${produktUuid}/${variantName}.${ext}`;
  if (dryRun) return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${key}`;
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${key}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "x-upsert": "true",
      "cache-control": "public, max-age=31536000, immutable",
    },
    body: new Uint8Array(buf),
  });
  if (!r.ok) throw new Error(`upload ${r.status}: ${(await r.text().catch(()=>"")).slice(0,200)}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${key}`;
}

async function tryRead(url) {
  const p = fileFor(url);
  if (!p) return null;
  try { return await readFile(p); } catch { return null; }
}

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

console.log(`✦ Migration Bilder → Supabase Storage ${dryRun ? "(DRY-RUN)" : ""}`);
console.log(`  Bucket: ${SUPABASE_STORAGE_BUCKET} · UPLOAD_DIR: ${UPLOAD_DIR}\n`);

const { rows } = await client.query(
  `SELECT id, produkt_id, url, url_thumb, url_medium, url_large FROM sebo.produktbilder ORDER BY erstellt_am`
);
console.log(`  ${rows.length} produktbilder-Zeilen gefunden.\n`);

let migriert = 0, skipped = 0, fehlend = 0;

for (const row of rows) {
  if (isSupabase(row.url)) { skipped++; continue; }              // schon migriert
  if (!isLocal(row.url))   { skipped++; continue; }              // externe URL → lassen

  // baseId aus altem Dateinamen: <uuid>.<ext> ; Varianten <uuid>-thumb.webp etc.
  const origName = row.url.split("/").pop();              // <uuid>.<ext>
  const ext      = (origName.split(".").pop() || "jpg").toLowerCase();
  const variants = [
    ["original", ext,    row.url],
    ["thumb",    "webp", row.url_thumb],
    ["medium",   "webp", row.url_medium],
    ["large",    "webp", row.url_large],
  ];

  const neu = {};
  let okOriginal = false;
  for (const [name, vext, vurl] of variants) {
    if (!vurl) continue;
    const buf = await tryRead(vurl);
    if (!buf) { if (name === "original") fehlend++; continue; }
    try {
      const newUrl = await uploadOne(row.produkt_id, name, vext, buf);
      neu[name] = newUrl;
      if (name === "original") okOriginal = true;
    } catch (e) {
      console.error(`  ✗ ${row.id} ${name}: ${e.message}`);
    }
  }

  if (!okOriginal) { fehlend++; continue; }  // ohne Original kein DB-Update

  if (!dryRun) {
    await client.query(
      `UPDATE sebo.produktbilder SET url=$1, url_thumb=$2, url_medium=$3, url_large=$4 WHERE id=$5`,
      [neu.original, neu.thumb ?? null, neu.medium ?? null, neu.large ?? null, row.id]
    );
    // Hauptbild-URL am Produkt mitziehen wenn sie auf das alte Original zeigt
    await client.query(
      `UPDATE sebo.produkte SET hauptbild_url=$1 WHERE id=$2 AND hauptbild_url=$3`,
      [neu.original, row.produkt_id, row.url]
    );
  }
  migriert++;
  process.stdout.write(`\r  migriert: ${migriert}  skip: ${skipped}  fehlend: ${fehlend}`);
}

await client.end();
console.log(`\n\n✦ Fertig. ${migriert} migriert · ${skipped} übersprungen · ${fehlend} ohne Datei.`);
if (fehlend > 0) console.log(`  ⚠ ${fehlend} Bilder hatten keine Datei mehr (vermutlich durch Rebuild verloren).`);
