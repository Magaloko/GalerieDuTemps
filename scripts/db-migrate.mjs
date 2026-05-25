#!/usr/bin/env node
/**
 * galeriedutemps · DB-Migrationen ausführen
 *
 * Liest sql/*.sql in alphabetischer Reihenfolge,
 * vergleicht mit sebo.schema_migrations und führt
 * nur neue (oder geänderte) Dateien aus.
 *
 * Verwendung:
 *   npm run db:migrate
 *   npm run db:migrate -- --dry-run   (nur anzeigen, nicht ausführen)
 *   npm run db:migrate -- --force     (auch bei Hash-Mismatch erneut ausführen)
 *
 * Voraussetzung: DATABASE_URL in .env.local oder Umgebung
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlDir    = join(__dirname, "..", "sql");
const dryRun    = process.argv.includes("--dry-run");
const force     = process.argv.includes("--force");

// .env.local laden (ohne Dependency)
try {
  const envFile = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
  for (const line of envFile.split("\n")) {
    const m = line.match(/^([A-Z_]+)\s*=\s*(.+)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch { /* keine .env.local — OK, env-vars könnten gesetzt sein */ }

if (!process.env.DATABASE_URL) {
  console.error("✗ DATABASE_URL nicht gesetzt. Prüfe .env.local oder Umgebung.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

console.log(`✦ galeriedutemps · DB-Migrationen ${dryRun ? "(DRY-RUN)" : ""}`);
console.log(`  Datenbank: ${process.env.DATABASE_URL.replace(/:[^:]+@/, ":***@")}\n`);

// 1. Bootstrap-Migration (legt schema_migrations-Tabelle an, ist selbst idempotent)
const bootstrapSql = readFileSync(join(sqlDir, "000_schema_migrations.sql"), "utf8");
await client.query(bootstrapSql);

// 2. Bereits ausgeführte Migrationen laden
const { rows: ausgefuehrt } = await client.query(
  `SELECT filename, sha256 FROM sebo.schema_migrations`
);
const ausgefuehrtMap = new Map(ausgefuehrt.map(r => [r.filename, r.sha256]));

// 3. Alle SQL-Files alphabetisch durchgehen
const files = readdirSync(sqlDir)
  .filter(f => f.endsWith(".sql") && f !== "000_schema_migrations.sql")
  .sort();

let neue = 0;
let geaendert = 0;
let skipped = 0;

for (const file of files) {
  const inhalt = readFileSync(join(sqlDir, file), "utf8");
  const sha = createHash("sha256").update(inhalt).digest("hex");
  const prev = ausgefuehrtMap.get(file);

  if (prev && prev === sha) {
    console.log(`  ✓ ${file}  (bereits ausgeführt)`);
    skipped++;
    continue;
  }
  if (prev && prev !== sha && !force) {
    console.log(`  ⚠ ${file}  (geändert seit letzter Ausführung — übersprungen, --force zum Erzwingen)`);
    geaendert++;
    continue;
  }

  console.log(`  → ${file}  ${dryRun ? "(DRY-RUN, nicht ausgeführt)" : "ausführen ..."}`);
  if (dryRun) continue;

  const start = Date.now();
  try {
    await client.query("BEGIN");
    await client.query(inhalt);
    await client.query(
      `INSERT INTO sebo.schema_migrations (filename, sha256, dauer_ms)
       VALUES ($1, $2, $3)
       ON CONFLICT (filename) DO UPDATE SET sha256 = $2, executed_am = now(), dauer_ms = $3`,
      [file, sha, Date.now() - start]
    );
    await client.query("COMMIT");
    console.log(`    ✓ erfolgreich (${Date.now() - start}ms)`);
    neue++;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`    ✗ FEHLER:`, err.message);
    process.exit(1);
  }
}

await client.end();

console.log(`\n✦ Fertig.  ${neue} neu  ·  ${skipped} bereits ausgeführt  ·  ${geaendert} geändert (skip)`);
