#!/usr/bin/env node
/**
 * Generates a portable SQL file with INSERTs for all journal markdown
 * articles in content/journal/*.md. Output: scripts/_journal-seed.sql
 *
 * The SQL is idempotent via ON CONFLICT (slug) DO UPDATE — safe to re-run.
 * Run it in Supabase-SQL-Editor or via `psql $DATABASE_URL -f scripts/_journal-seed.sql`.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir       = join(__dirname, "..", "content", "journal");
const outFile   = join(__dirname, "_journal-seed.sql");

// --publish-Flag: erzeugt SQL die Artikel direkt veröffentlicht (statt Entwurf)
const PUBLISH = process.argv.includes("--publish");

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error("no frontmatter");
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-z_]+):\s*(.+)$/);
    if (!kv) continue;
    let val = kv[2].trim();
    if (val.startsWith("[") && val.endsWith("]")) meta[kv[1]] = JSON.parse(val);
    else if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      meta[kv[1]] = val.slice(1, -1);
    else meta[kv[1]] = val;
  }
  return { meta, body: m[2].trim() };
}

// SQL-string-escape: doubles single quotes
const q = (s) => s == null ? "NULL" : `'${String(s).replace(/'/g, "''")}'`;
const qArr = (arr) => `ARRAY[${arr.map(q).join(",")}]::text[]`;

// README.md hat kein Frontmatter — nur nummerierte Artikel-Files einsammeln
const files = readdirSync(dir)
  .filter(f => /^\d+.*\.md$/.test(f) && !f.startsWith("_"))
  .sort();

const lines = [
  "-- ============================================================================",
  "-- Journal-Seed · Galerie du Temps",
  "-- Auto-generiert aus content/journal/*.md via scripts/gen-journal-sql.mjs",
  "-- Idempotent: ON CONFLICT (slug) DO UPDATE — sicher mehrfach ausführbar.",
  "--",
  "-- Anwenden in Supabase:",
  "--   1) Dashboard → SQL Editor → New query",
  "--   2) Inhalt dieser Datei einfügen",
  "--   3) Run",
  "--",
  "-- Oder via psql:",
  "--   psql $DATABASE_URL -f scripts/_journal-seed.sql",
  "--",
  PUBLISH
    ? "-- 🔴 ARTIKEL WERDEN SOFORT VERÖFFENTLICHT (veroeffentlicht=true, _am=now())"
    : "-- Artikel werden als ENTWURF importiert (veroeffentlicht=false).",
  PUBLISH
    ? "-- Nach Run sind alle 6 Artikel live auf /journal."
    : "-- Veröffentlichen: im Admin (/admin/journal) oder UPDATE-Statement am Ende.",
  "-- ============================================================================",
  "",
  "BEGIN;",
  "",
];

for (const f of files) {
  const text = readFileSync(join(dir, f), "utf8");
  const { meta, body } = parseFrontmatter(text);

  lines.push(`-- ── ${meta.slug} ──────────────────────────────────────`);
  lines.push(`INSERT INTO sebo.journal_posts`);
  lines.push(`  (titel, slug, excerpt, markdown, tags, seo_titel, seo_beschreibung, autor_name, veroeffentlicht, veroeffentlicht_am)`);
  lines.push(`VALUES (`);
  lines.push(`  ${q(meta.titel)},`);
  lines.push(`  ${q(meta.slug)},`);
  lines.push(`  ${q(meta.excerpt)},`);
  lines.push(`  ${q(body)},`);
  lines.push(`  ${qArr(meta.tags || [])},`);
  lines.push(`  ${q(meta.seo_titel)},`);
  lines.push(`  ${q(meta.seo_beschreibung)},`);
  lines.push(`  ${q(meta.autor_name || "Galerie du Temps")},`);
  lines.push(`  ${PUBLISH ? "true" : "false"},`);
  lines.push(`  ${PUBLISH ? "now()" : "NULL"}`);
  lines.push(`)`);
  lines.push(`ON CONFLICT (slug) DO UPDATE SET`);
  lines.push(`  titel              = EXCLUDED.titel,`);
  lines.push(`  excerpt            = EXCLUDED.excerpt,`);
  lines.push(`  markdown           = EXCLUDED.markdown,`);
  lines.push(`  tags               = EXCLUDED.tags,`);
  lines.push(`  seo_titel          = EXCLUDED.seo_titel,`);
  lines.push(`  seo_beschreibung   = EXCLUDED.seo_beschreibung,`);
  lines.push(`  autor_name         = EXCLUDED.autor_name,`);
  lines.push(`  veroeffentlicht    = EXCLUDED.veroeffentlicht,`);
  // Wenn schon veröffentlicht: bestehendes Datum behalten; sonst neues setzen
  lines.push(`  veroeffentlicht_am = COALESCE(sebo.journal_posts.veroeffentlicht_am, EXCLUDED.veroeffentlicht_am);`);
  lines.push("");
}

lines.push("COMMIT;");
lines.push("");
lines.push("-- ── Alle auf einmal veröffentlichen (optional, ausgekommentiert) ─────");
lines.push("-- UPDATE sebo.journal_posts");
lines.push("--   SET veroeffentlicht = true,");
lines.push("--       veroeffentlicht_am = COALESCE(veroeffentlicht_am, now())");
lines.push("--  WHERE slug IN (");
for (const f of files) {
  const { meta } = parseFrontmatter(readFileSync(join(dir, f), "utf8"));
  lines.push(`--    '${meta.slug}',`);
}
// trim trailing comma
const last = lines.length - 1;
lines[last] = lines[last].replace(/,$/, "");
lines.push("--  );");
lines.push("");

writeFileSync(outFile, lines.join("\n"), "utf8");
console.log(`✓ Generiert: ${outFile}`);
console.log(`  ${files.length} Artikel · ${Math.round(lines.join("\n").length / 1024)}KB SQL`);
