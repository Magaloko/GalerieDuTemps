#!/usr/bin/env node
/**
 * Seed-Script · Import von Markdown-Artikeln aus content/journal/ in
 * die journal_posts-Tabelle.
 *
 * Verwendet die DATABASE_URL aus der Umgebung. Idempotent — Posts mit
 * existierendem Slug werden UPSERTet (aktualisiert), neue Posts werden
 * INSERTed.
 *
 * Frontmatter-Format pro .md-File:
 *   ---
 *   slug:            ...
 *   titel:           ...
 *   seo_titel:       ...
 *   seo_beschreibung: ...
 *   excerpt:         ...
 *   tags:            ["...", "..."]
 *   autor_name:      ...
 *   ---
 *   <markdown-body>
 *
 * Usage:
 *   node scripts/seed-journal.mjs              # nur INSERT, skip bei dupl-slug
 *   node scripts/seed-journal.mjs --upsert     # UPSERT — überschreibt existing
 *   node scripts/seed-journal.mjs --publish    # zusätzlich veroeffentlicht=true
 *
 * Erfordert: DATABASE_URL gesetzt (.env.local oder ENV).
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname  = dirname(fileURLToPath(import.meta.url));
const journalDir = join(__dirname, "..", "content", "journal");

const args     = process.argv.slice(2);
const upsert   = args.includes("--upsert");
const publish  = args.includes("--publish");

// ── .env.local einlesen falls vorhanden ──────────────────────────────────
try {
  const envPath = join(__dirname, "..", ".env.local");
  const envText = readFileSync(envPath, "utf8");
  for (const line of envText.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  }
} catch {
  // .env.local nicht vorhanden — OK, ENV muss schon gesetzt sein
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("✗ DATABASE_URL ist nicht gesetzt. Setze sie via .env.local oder ENV.");
  process.exit(1);
}

// ── Minimaler YAML-Frontmatter-Parser ────────────────────────────────────
// Erwartet einfaches key: value Format mit Arrays als ["a","b"]
function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error("Kein Frontmatter gefunden");
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-z_]+):\s*(.+)$/);
    if (!kv) continue;
    const key = kv[1];
    let val   = kv[2].trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      // Array
      meta[key] = JSON.parse(val);
    } else if ((val.startsWith('"') && val.endsWith('"')) ||
               (val.startsWith("'") && val.endsWith("'"))) {
      meta[key] = val.slice(1, -1);
    } else {
      meta[key] = val;
    }
  }
  return { meta, body: m[2].trim() };
}

// ── Markdown-Files einlesen ──────────────────────────────────────────────
const files = readdirSync(journalDir)
  .filter(f => f.endsWith(".md") && !f.startsWith("_"))
  .sort();

console.log(`📚 Gefunden: ${files.length} Markdown-Files in ${journalDir}`);

// ── DB-Connection ────────────────────────────────────────────────────────
const pool = new pg.Pool({ connectionString: databaseUrl });

let inserted = 0;
let updated  = 0;
let skipped  = 0;

for (const file of files) {
  const text = readFileSync(join(journalDir, file), "utf8");
  let parsed;
  try {
    parsed = parseFrontmatter(text);
  } catch (err) {
    console.warn(`⚠️  ${file}: ${err.message} — übersprungen`);
    continue;
  }
  const { meta, body } = parsed;

  if (!meta.slug || !meta.titel) {
    console.warn(`⚠️  ${file}: slug oder titel fehlt — übersprungen`);
    continue;
  }

  // Prüfen ob existiert
  const existing = await pool.query(
    `SELECT id FROM sebo.journal_posts WHERE slug = $1`,
    [meta.slug]
  );
  const exists = (existing.rowCount ?? 0) > 0;

  if (exists && !upsert) {
    console.log(`⏭️  ${meta.slug} existiert bereits — skip (nutze --upsert zum Überschreiben)`);
    skipped++;
    continue;
  }

  const values = {
    titel:            meta.titel,
    slug:             meta.slug,
    excerpt:          meta.excerpt ?? null,
    markdown:         body,
    tags:             meta.tags ?? [],
    seo_titel:        meta.seo_titel ?? null,
    seo_beschreibung: meta.seo_beschreibung ?? null,
    autor_name:       meta.autor_name ?? "Galerie du Temps",
    veroeffentlicht:  publish,
  };

  if (exists) {
    // UPDATE
    await pool.query(
      `UPDATE sebo.journal_posts
         SET titel = $1, excerpt = $2, markdown = $3, tags = $4::text[],
             seo_titel = $5, seo_beschreibung = $6, autor_name = $7,
             veroeffentlicht = $8,
             veroeffentlicht_am = CASE WHEN $8 = true THEN COALESCE(veroeffentlicht_am, now()) ELSE NULL END
       WHERE slug = $9`,
      [
        values.titel, values.excerpt, values.markdown, values.tags,
        values.seo_titel, values.seo_beschreibung, values.autor_name,
        values.veroeffentlicht, values.slug,
      ]
    );
    console.log(`🔄 Updated: ${meta.slug}${publish ? " (published)" : ""}`);
    updated++;
  } else {
    // INSERT
    await pool.query(
      `INSERT INTO sebo.journal_posts
         (titel, slug, excerpt, markdown, tags, seo_titel, seo_beschreibung, autor_name, veroeffentlicht, veroeffentlicht_am)
       VALUES ($1, $2, $3, $4, $5::text[], $6, $7, $8, $9, $10)`,
      [
        values.titel, values.slug, values.excerpt, values.markdown,
        values.tags, values.seo_titel, values.seo_beschreibung,
        values.autor_name, values.veroeffentlicht,
        publish ? new Date() : null,
      ]
    );
    console.log(`✓  Inserted: ${meta.slug}${publish ? " (published)" : ""}`);
    inserted++;
  }
}

await pool.end();

console.log("");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`📊 Fertig: ${inserted} neu, ${updated} aktualisiert, ${skipped} übersprungen`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
if (!publish && (inserted > 0 || updated > 0)) {
  console.log("");
  console.log("💡 Artikel sind als Entwurf importiert. Veröffentlichen via:");
  console.log("    1. /admin/journal — Edit + Toggle 'veröffentlicht'");
  console.log("    2. node scripts/seed-journal.mjs --upsert --publish");
}
