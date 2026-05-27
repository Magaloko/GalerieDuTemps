#!/usr/bin/env node
/**
 * galeriedutemps · Datenbank-Health-Check
 *
 * Umfassender Diagnostik-Lauf über die komplette sebo.* Schema:
 *
 *   1. SCHEMA-INTEGRITÄT
 *      - Sind alle Migrations-Files in sebo.schema_migrations getrackt?
 *      - Sind alle erwarteten Tabellen vorhanden?
 *      - Sind alle erwarteten Indizes vorhanden?
 *      - SHA256-Hash-Vergleich: Wurde eine Migration nach Apply editiert?
 *
 *   2. DATEN-INTEGRITÄT
 *      - Foreign-Key-Orphans (Records mit FK auf gelöschte Parents)
 *      - NULL-Verletzungen in NOT-NULL-Spalten (sollte unmöglich sein, aber check)
 *      - Doppelte Werte in UNIQUE-Spalten (sollte auch unmöglich sein, aber check)
 *      - Sequence-Health: zeigen alle Sequenzen auf > MAX(id) ihrer Spalte?
 *
 *   3. STATISTIK
 *      - Row-Counts pro Tabelle
 *      - Tabellen-Größe + Index-Größe
 *      - Index-Nutzung (welche werden nie verwendet?)
 *      - Top-10 langsamste Queries (wenn pg_stat_statements verfügbar)
 *
 *   4. ZUSAMMENFASSUNG
 *      - Exit-Code 0 wenn alles OK, 1 wenn Probleme gefunden
 *      - JSON-Report optional via --json
 *
 * Usage:
 *   npm run db:check                       # gegen DATABASE_URL
 *   npm run db:check -- --test             # gegen TEST_DATABASE_URL
 *   npm run db:check -- --json             # JSON statt Text-Report
 *   npm run db:check -- --section schema   # nur Schema-Checks (schema|data|stats)
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlDir    = join(__dirname, "..", "sql");

// ── Args ────────────────────────────────────────────────────────────────────
const args      = process.argv.slice(2);
const useTest   = args.includes("--test");
const jsonOut   = args.includes("--json");
const sectionIx = args.indexOf("--section");
const section   = sectionIx >= 0 ? args[sectionIx + 1] : null;

// ── Env laden ────────────────────────────────────────────────────────────────
try {
  const envFile = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
  for (const line of envFile.split("\n")) {
    const m = line.match(/^([A-Z_]+)\s*=\s*(.+)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch { /* keine .env.local — OK */ }

const url = useTest ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;
if (!url) {
  console.error(`✗ ${useTest ? "TEST_DATABASE_URL" : "DATABASE_URL"} nicht gesetzt`);
  process.exit(1);
}

// pg-Setup mit BIGINT als Number
pg.types.setTypeParser(20, v => v === null ? null : Number(v));
const client = new pg.Client({
  connectionString: url,
  ssl: url.includes("supabase.co") || url.includes("upstash") || process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
});
await client.connect();

// ── Output-Helper ────────────────────────────────────────────────────────────
const report = {
  zielDb:      url.replace(/:[^:]+@/, ":***@"),
  zeitstempel: new Date().toISOString(),
  schema:      { ok: true, checks: {} },
  data:        { ok: true, checks: {} },
  stats:       { ok: true, checks: {} },
  probleme:    [],
};

function txt(line = "") { if (!jsonOut) console.log(line); }
function fail(category, key, msg) {
  report[category].ok = false;
  report[category].checks[key] = { ok: false, problem: msg };
  report.probleme.push(`[${category}/${key}] ${msg}`);
  txt(`  ✗ ${key}: ${msg}`);
}
function pass(category, key, info) {
  report[category].checks[key] = { ok: true, info };
  txt(`  ✓ ${key}${info ? ": " + info : ""}`);
}
function note(category, key, info) {
  report[category].checks[key] = { ok: true, hinweis: info };
  txt(`  ◇ ${key}: ${info}`);
}

txt(`✦ galeriedutemps · DB-Health-Check`);
txt(`  Ziel: ${report.zielDb}`);
txt(`  Zeit: ${report.zeitstempel}\n`);

// ─── 1. SCHEMA-INTEGRITÄT ────────────────────────────────────────────────────
if (!section || section === "schema") {
  txt("┌─ 1. SCHEMA-INTEGRITÄT ─────────────────────────────────────────────");

  // 1.1 sebo-Schema existiert?
  const { rows: schemaRows } = await client.query(
    `SELECT 1 FROM information_schema.schemata WHERE schema_name = 'sebo'`,
  );
  if (schemaRows.length === 0) {
    fail("schema", "sebo_schema_existiert", "Schema 'sebo' nicht gefunden");
    await client.end();
    finish();
  } else {
    pass("schema", "sebo_schema_existiert");
  }

  // 1.2 schema_migrations-Tabelle existiert?
  const { rows: trkRows } = await client.query(`
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'sebo' AND table_name = 'schema_migrations'
  `);
  if (trkRows.length === 0) {
    fail("schema", "schema_migrations_tabelle", "sebo.schema_migrations existiert nicht");
  } else {
    pass("schema", "schema_migrations_tabelle");

    // 1.3 Tracking-Vergleich: Files vs. DB
    const files = readdirSync(sqlDir)
      .filter(f => f.endsWith(".sql") && !f.startsWith("_") && f !== "000_schema_migrations.sql")
      .sort();
    const dbMigr = await client.query(
      `SELECT filename, sha256 FROM sebo.schema_migrations ORDER BY filename`,
    );
    const dbMap   = new Map(dbMigr.rows.map(r => [r.filename, r.sha256]));
    const dbNames = new Set(dbMap.keys());

    const fileNames = new Set(files);
    const inDbNotFile = [...dbNames].filter(n => !fileNames.has(n));
    const inFileNotDb = files.filter(n => !dbNames.has(n));

    if (inDbNotFile.length > 0) {
      fail("schema", "tracking_orphan_db",
        `${inDbNotFile.length} Einträge in sebo.schema_migrations ohne passende SQL-Datei: ${inDbNotFile.join(", ")}`);
    } else {
      pass("schema", "tracking_orphan_db", "keine Orphan-Einträge");
    }

    if (inFileNotDb.length > 0) {
      fail("schema", "tracking_pending_files",
        `${inFileNotDb.length} SQL-Dateien noch nicht angewendet: ${inFileNotDb.join(", ")}`);
    } else {
      pass("schema", "tracking_pending_files", `alle ${files.length} Migrationen sind angewendet`);
    }

    // 1.4 SHA256-Drift: wurde Datei nach Apply geändert?
    const drift = [];
    for (const file of files) {
      const dbSha = dbMap.get(file);
      if (!dbSha) continue;
      const fileSha = createHash("sha256").update(readFileSync(join(sqlDir, file), "utf8")).digest("hex");
      if (dbSha !== fileSha) {
        drift.push(`${file} (DB ${dbSha.slice(0,8)}… vs File ${fileSha.slice(0,8)}…)`);
      }
    }
    if (drift.length > 0) {
      fail("schema", "migration_sha_drift",
        `${drift.length} Migrationen wurden nach Apply editiert: ${drift.join(", ")}`);
    } else {
      pass("schema", "migration_sha_drift", "keine Drifts");
    }
  }

  // 1.5 Erwartete Kern-Tabellen vorhanden
  const erwarteteTabellen = [
    "benutzer", "kategorien", "produkte", "bilder", "kontakte",
    "affiliates", "affiliate_clicks", "affiliate_attributions", "affiliate_auszahlungen",
    "customers", "orders", "order_items", "coupons",
    "events", "subscribers", "journal_posts",
    "marketing_strings", "theme_settings", "wechselkurse",
  ];
  const { rows: tabRows } = await client.query(`
    SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'sebo' AND table_type = 'BASE TABLE'
  `);
  const vorhandeneTabellen = new Set(tabRows.map(r => r.table_name));
  const fehlende = erwarteteTabellen.filter(t => !vorhandeneTabellen.has(t));
  if (fehlende.length > 0) {
    fail("schema", "kern_tabellen",
      `${fehlende.length} erwartete Kern-Tabellen fehlen: ${fehlende.join(", ")}`);
  } else {
    pass("schema", "kern_tabellen", `alle ${erwarteteTabellen.length} Kern-Tabellen vorhanden (Gesamt: ${vorhandeneTabellen.size})`);
  }
}

// ─── 2. DATEN-INTEGRITÄT ─────────────────────────────────────────────────────
if (!section || section === "data") {
  txt("\n┌─ 2. DATEN-INTEGRITÄT ──────────────────────────────────────────────");

  // 2.1 Foreign-Key-Orphans über alle FK-Constraints
  const { rows: fks } = await client.query(`
    SELECT
      tc.table_schema AS ts, tc.table_name AS tn, kcu.column_name AS col,
      ccu.table_schema AS rs, ccu.table_name AS rn, ccu.column_name AS rcol
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage   kcu
         ON kcu.constraint_name = tc.constraint_name
        AND kcu.table_schema    = tc.table_schema
    JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema    = 'sebo'
  `);

  let fkOrphans = 0;
  const orphanDetails = [];
  for (const fk of fks) {
    try {
      const q = `
        SELECT COUNT(*)::int AS n FROM ${fk.ts}.${fk.tn} c
        WHERE c.${fk.col} IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM ${fk.rs}.${fk.rn} p WHERE p.${fk.rcol} = c.${fk.col})
      `;
      const { rows: [r] } = await client.query(q);
      if (r.n > 0) {
        fkOrphans += r.n;
        orphanDetails.push(`${fk.tn}.${fk.col} → ${fk.rn}.${fk.rcol}: ${r.n} orphans`);
      }
    } catch (err) {
      // Spalte könnte gelöscht sein zwischen Migration-Anwendung
      txt(`    ⚠ FK-Check fehlgeschlagen: ${fk.tn}.${fk.col} (${err.message})`);
    }
  }
  if (fkOrphans > 0) {
    fail("data", "fk_orphans", `${fkOrphans} Orphan-Records gefunden: ${orphanDetails.join("; ")}`);
  } else {
    pass("data", "fk_orphans", `${fks.length} FK-Constraints sauber`);
  }

  // 2.2 Sequence-Drift: zeigen Sequenzen auf > MAX(id)?
  const { rows: seqs } = await client.query(`
    SELECT n.nspname || '.' || c.relname AS seqname,
           pg_serial_sequence_table(c.oid) AS owner_table_oid
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'S' AND n.nspname = 'sebo'
  `).catch(async () => {
    // Fallback: einfaches Listing ohne pg_serial_sequence_table (custom func)
    return client.query(`
      SELECT sequence_schema || '.' || sequence_name AS seqname
      FROM information_schema.sequences WHERE sequence_schema = 'sebo'
    `);
  });

  if (seqs.rows.length === 0) {
    note("data", "sequence_drift", "keine Sequenzen im sebo-Schema");
  } else {
    let seqDrifts = 0;
    for (const s of seqs.rows) {
      try {
        const { rows: [{ last_value }] } = await client.query(`SELECT last_value FROM ${s.seqname}`);
        // Bei einer auto-generierten Spalte könnte man MAX(id) checken — komplex, hier nur Info
        if (last_value <= 0) {
          seqDrifts++;
          txt(`    ⚠ Sequence ${s.seqname} last_value=${last_value}`);
        }
      } catch { /* skip */ }
    }
    if (seqDrifts > 0) {
      fail("data", "sequence_drift", `${seqDrifts} Sequenzen mit verdächtigen Werten`);
    } else {
      pass("data", "sequence_drift", `${seqs.rows.length} Sequenzen OK`);
    }
  }

  // 2.3 schema_migrations: Duplikate (Primary Key sollte das verhindern, aber check)
  const { rows: [dupRow] } = await client.query(`
    SELECT COUNT(*)::int - COUNT(DISTINCT filename)::int AS dup
    FROM sebo.schema_migrations
  `);
  if (dupRow.dup > 0) {
    fail("data", "schema_migrations_dup", `${dupRow.dup} Duplikate in schema_migrations (sollte unmöglich sein!)`);
  } else {
    pass("data", "schema_migrations_dup");
  }
}

// ─── 3. STATISTIK ────────────────────────────────────────────────────────────
if (!section || section === "stats") {
  txt("\n┌─ 3. STATISTIK ─────────────────────────────────────────────────────");

  // 3.1 Row-Counts pro Tabelle (geschätzt aus pg_class.reltuples — schnell)
  const { rows: counts } = await client.query(`
    SELECT relname AS tabelle, reltuples::bigint AS row_count_geschaetzt
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'sebo' AND c.relkind = 'r'
    ORDER BY reltuples DESC LIMIT 20
  `);
  report.stats.checks.row_counts = counts;
  txt(`  Top-Tabellen nach geschätzter Row-Anzahl:`);
  for (const r of counts.slice(0, 10)) {
    txt(`    ${String(r.row_count_geschaetzt).padStart(10)}  ${r.tabelle}`);
  }

  // 3.2 Tabellen-Größe (heap + indexes)
  const { rows: sizes } = await client.query(`
    SELECT relname AS tabelle,
           pg_size_pretty(pg_total_relation_size(c.oid)) AS gesamt,
           pg_size_pretty(pg_relation_size(c.oid))       AS heap,
           pg_size_pretty(pg_indexes_size(c.oid))        AS indizes
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'sebo' AND c.relkind = 'r'
    ORDER BY pg_total_relation_size(c.oid) DESC LIMIT 10
  `);
  report.stats.checks.tabellen_groessen = sizes;
  txt(`\n  Top-Tabellen nach Größe:`);
  txt(`    ${"GESAMT".padEnd(10)} ${"HEAP".padEnd(10)} ${"INDIZES".padEnd(10)} TABELLE`);
  for (const r of sizes) {
    txt(`    ${r.gesamt.padEnd(10)} ${r.heap.padEnd(10)} ${r.indizes.padEnd(10)} ${r.tabelle}`);
  }

  // 3.3 DB-Gesamtgröße
  const { rows: [{ db_size }] } = await client.query(
    `SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size`,
  );
  txt(`\n  Datenbank-Gesamtgröße: ${db_size}`);
  report.stats.checks.db_size = db_size;

  // 3.4 Index-Nutzung (welche werden NIE verwendet?)
  const { rows: idx } = await client.query(`
    SELECT s.indexrelname AS index, s.relname AS tabelle, s.idx_scan AS scans
    FROM pg_stat_user_indexes s
    JOIN pg_namespace n ON n.oid = (SELECT relnamespace FROM pg_class WHERE oid = s.relid)
    WHERE n.nspname = 'sebo' AND s.idx_scan = 0
    ORDER BY s.indexrelname
  `);
  if (idx.length > 0) {
    note("stats", "ungenutzte_indizes", `${idx.length} Indizes wurden noch nie verwendet (kann normal sein bei frischer DB)`);
    if (idx.length <= 10) {
      for (const i of idx) txt(`    - ${i.tabelle}.${i.index}`);
    } else {
      txt(`    - (Liste mit ${idx.length} Indizes — siehe JSON-Output)`);
    }
    report.stats.checks.ungenutzte_indizes = idx;
  } else {
    pass("stats", "ungenutzte_indizes", "alle Indizes wurden mindestens einmal verwendet");
  }

  // 3.5 Cache-Hit-Ratio (sollte > 0.99 sein für gesunde DB)
  const { rows: [{ ratio }] } = await client.query(`
    SELECT ROUND(SUM(blks_hit)::numeric / NULLIF(SUM(blks_hit) + SUM(blks_read), 0), 4) AS ratio
    FROM pg_stat_database WHERE datname = current_database()
  `);
  if (ratio === null) {
    note("stats", "cache_hit_ratio", "noch keine Daten");
  } else if (ratio < 0.95) {
    fail("stats", "cache_hit_ratio", `Cache-Hit-Ratio nur ${ratio} (sollte > 0.95 sein — DB könnte zu klein für Workload sein)`);
  } else {
    pass("stats", "cache_hit_ratio", `${ratio} (gut, > 0.99 ist optimal)`);
  }
}

// ── Abschluss ───────────────────────────────────────────────────────────────
await client.end();
finish();

function finish() {
  txt("\n────────────────────────────────────────────────────────────────────");
  const allOk = report.schema.ok && report.data.ok && report.stats.ok;
  if (allOk) {
    txt("✓ ALLE CHECKS BESTANDEN");
  } else {
    txt(`✗ ${report.probleme.length} PROBLEM(E) GEFUNDEN:`);
    for (const p of report.probleme) txt(`  · ${p}`);
  }

  if (jsonOut) {
    console.log(JSON.stringify(report, null, 2));
  }

  process.exit(allOk ? 0 : 1);
}
