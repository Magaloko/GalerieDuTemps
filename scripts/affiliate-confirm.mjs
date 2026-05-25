#!/usr/bin/env node
/**
 * vintage-market · Provisionen automatisch bestätigen
 * ─────────────────────────────────────────────────────────────────────────────
 * Setzt alle 'offen'-Provisionen auf 'bestaetigt', die älter als die
 * Widerrufsfrist (Default 14 Tage) sind.
 *
 * Cron (täglich 02:00):
 *   0 2 * * * /opt/vintage-market/scripts/affiliate-confirm.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// .env.local laden
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

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  // Widerrufsfrist aus Settings
  const settingsRes = await pool.query(
    `SELECT wert FROM sebo.affiliate_einstellungen WHERE schluessel = 'widerrufs_frist_tage'`
  );
  const frist = parseInt(settingsRes.rows[0]?.wert ?? "14");

  console.log(`[${new Date().toISOString()}] Bestätige offene Provisionen älter als ${frist} Tage …`);

  const result = await pool.query(
    `UPDATE sebo.provisionen
     SET status = 'bestaetigt', bestaetigt_am = now()
     WHERE status = 'offen'
       AND erstellt_am < now() - ($1 || ' days')::interval
     RETURNING id, affiliate_id, betrag_cent`,
    [frist]
  );

  console.log(`✓ ${result.rowCount} Provisionen bestätigt`);

  if ((result.rowCount ?? 0) > 0) {
    // Summe pro Affiliate
    const summen = new Map();
    for (const r of result.rows) {
      summen.set(r.affiliate_id, (summen.get(r.affiliate_id) ?? 0) + r.betrag_cent);
    }
    console.log(`  Betroffene Affiliates: ${summen.size}`);
    for (const [aid, summe] of summen) {
      console.log(`    ${aid}: ${(summe / 100).toFixed(2)} €`);
    }
  }
} catch (err) {
  console.error("✗ Fehler:", err.message);
  process.exit(1);
} finally {
  await pool.end();
}
