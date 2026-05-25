#!/usr/bin/env node
/**
 * galeriedutemps · Alte Affiliate-Klicks aufräumen
 * ─────────────────────────────────────────────────────────────────────────────
 * Löscht Klicks älter als 90 Tage (Default).
 *
 * Cron (wöchentlich Sonntag 03:00):
 *   0 3 * * 0 /opt/galeriedutemps/scripts/affiliate-cleanup.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, "..", ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}

const { default: pkg } = await import("pg");
const { Pool }         = pkg;

if (!process.env.DATABASE_URL) {
  console.error("✗ DATABASE_URL nicht gesetzt");
  process.exit(1);
}

const TAGE = parseInt(process.env.AFFILIATE_CLEANUP_TAGE ?? "90");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  console.log(`[${new Date().toISOString()}] Lösche Klicks älter als ${TAGE} Tage …`);

  const result = await pool.query(
    `DELETE FROM sebo.affiliate_klicks
     WHERE erstellt_am < now() - ($1 || ' days')::interval`,
    [TAGE]
  );

  console.log(`✓ ${result.rowCount} Klicks gelöscht`);

  // VACUUM für Speicher-Freigabe
  await pool.query(`VACUUM sebo.affiliate_klicks`);
  console.log(`✓ Tabelle vacuumed`);
} catch (err) {
  console.error("✗ Fehler:", err.message);
  process.exit(1);
} finally {
  await pool.end();
}
