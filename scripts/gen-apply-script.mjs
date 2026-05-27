#!/usr/bin/env node
/**
 * Generiert ein kombiniertes SQL-Apply-Script für Supabase SQL Editor:
 *  - Wendet noch nicht angewandte Migrationen (029, 030) an
 *  - Backfilled fehlende Einträge in sebo.schema_migrations (für 001-028)
 *    mit echten SHA256 der aktuellen Dateiinhalte
 *
 * Output: sql/_APPLY_FULL_BACKFILL.sql
 *
 * Nutzen: einmalig in Supabase ausführen → schema_migrations enthält alle
 * Files mit korrekten Hashes. Danach zeigt /admin/einstellungen/system OK.
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlDir    = join(__dirname, "..", "sql");

// Alle NNN_*.sql Files (sortiert)
const files = readdirSync(sqlDir)
  .filter(f => f.endsWith(".sql") && !f.startsWith("_") && /^\d{3}_/.test(f))
  .sort();

// Files die noch APPLIED werden müssen (Schema-Änderungen, nicht nur Tracking)
const PENDING_APPLY = [
  "029_feature_flags.sql",
  "030_bilder_varianten.sql",
  "031_hero_background.sql",
  "032_produkt_instagram.sql",
  "033_webhook_events.sql",
];

// SHA256 pro File computen
const sha256Map = new Map();
for (const f of files) {
  const content = readFileSync(join(sqlDir, f), "utf8");
  const sha     = createHash("sha256").update(content).digest("hex");
  sha256Map.set(f, sha);
}

let out = `-- ═══════════════════════════════════════════════════════════════════════════
-- _APPLY_FULL_BACKFILL.sql
-- Generiert: ${new Date().toISOString()}
--
-- EINMALIG in Supabase SQL Editor ausführen (paste → Run).
--
-- Was passiert:
--  1. Migrationen 029 + 030 anwenden (Schema-Änderungen)
--  2. Back-Fill: alle sql/NNN_*.sql Dateien in sebo.schema_migrations
--     eintragen, sodass /admin/einstellungen/system OK zeigt.
--
-- Idempotent: alles ON CONFLICT DO NOTHING / IF NOT EXISTS.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;
`;

// ── Pending-Apply: 029 + 030 (echte SQL-Inhalte inline) ─────────────────────
for (const f of PENDING_APPLY) {
  const content = readFileSync(join(sqlDir, f), "utf8");
  out += `\n-- ─── ${f} ─────────────────────────────────────────────────────────\n`;
  out += content;
  out += `\n`;
}

// ── Tracking-Backfill für ALLE 31 Files ─────────────────────────────────────
out += `\n-- ═══ Tracking-Backfill ═══════════════════════════════════════════════════\n`;
out += `-- Marker für ALLE Migrations-Files mit echtem SHA256 der aktuellen Datei.\n`;
out += `-- ON CONFLICT DO NOTHING → bestehende Einträge bleiben unverändert.\n`;
out += `\n`;
out += `INSERT INTO sebo.schema_migrations (filename, sha256, dauer_ms) VALUES\n`;
const rows = files.map((f) => `  ('${f}', '${sha256Map.get(f)}', 0)`);
out += rows.join(",\n") + "\n";
out += `ON CONFLICT (filename) DO NOTHING;\n`;

out += `\nCOMMIT;\n\n`;
out += `-- Verifikation:\n`;
out += `-- SELECT COUNT(*) AS migrationen FROM sebo.schema_migrations;\n`;
out += `--   → Sollte ${files.length} sein.\n`;
out += `-- SELECT * FROM sebo.feature_flags;\n`;
out += `-- SELECT column_name FROM information_schema.columns\n`;
out += `--  WHERE table_schema='sebo' AND table_name='produktbilder' ORDER BY ordinal_position;\n`;

const outPath = join(sqlDir, "_APPLY_FULL_BACKFILL.sql");
writeFileSync(outPath, out, "utf8");
console.log(`✓ Generated: ${outPath}`);
console.log(`  Files tracked: ${files.length}`);
console.log(`  Pending-apply: ${PENDING_APPLY.join(", ")}`);
