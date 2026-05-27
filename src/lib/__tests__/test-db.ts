/**
 * Test-DB-Helper.
 *
 * STRATEGIE
 * ─────────
 * DB-Tests laufen NUR wenn TEST_DATABASE_URL gesetzt ist — NICHT
 * DATABASE_URL (das ist Production / Dev). Damit kann niemand versehentlich
 * Tests gegen Live-Daten fahren.
 *
 * Bei jedem Suite-Start:
 *   1. Connect zur Test-DB (sollte leer / wegwerf-bar sein)
 *   2. Schema `sebo` droppen + alle Migrationen aus sql/*.sql neu anwenden
 *   3. Tests laufen, jeder Test in seiner eigenen Transaction die am Ende
 *      gerollback wird → Tests sind isoliert, keine Daten-Lecks zwischen
 *      Tests
 *
 * SETUP-ANLEITUNG
 * ───────────────
 * Lokal mit Docker:
 *   docker run --name pg-test -e POSTGRES_PASSWORD=test \
 *     -p 5433:5432 -d postgres:16
 *   export TEST_DATABASE_URL="postgresql://postgres:test@localhost:5433/postgres"
 *   npm test
 *
 * Lokal mit Supabase-Test-Projekt:
 *   Lege ein zweites Supabase-Projekt an (NUR für Tests)
 *   export TEST_DATABASE_URL="postgresql://...test-projekt..."
 *   npm test
 *
 * Lokal ohne Postgres:
 *   Tests werden SKIPPT (mit Hinweis im Output)
 *   npm test  → DB-Tests: "skipped (TEST_DATABASE_URL not set)"
 */

import { Pool, type PoolClient } from "pg";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlDir    = join(__dirname, "..", "..", "..", "sql");

let pool: Pool | null = null;
let schemaReady = false;

/**
 * Returns the test DB pool, or null if not configured.
 * Tests should use `describe.skipIf(!testDbAvailable())` to skip gracefully.
 */
export function getTestPool(): Pool | null {
  if (pool) return pool;
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return null;

  // Safety-Check: NIEMALS gegen Production-DB testen
  if (url.includes("supabase.co") && !url.includes("test")) {
    throw new Error(
      "[test-db] TEST_DATABASE_URL sieht nach Production-Supabase aus. " +
      "Refusing to run tests against production. Setze eine echte Test-DB."
    );
  }
  if (process.env.DATABASE_URL === url) {
    throw new Error(
      "[test-db] TEST_DATABASE_URL === DATABASE_URL. Refusing — " +
      "Tests würden gegen die normale Dev-DB laufen und Daten löschen."
    );
  }

  pool = new Pool({ connectionString: url, max: 5 });
  return pool;
}

export function testDbAvailable(): boolean {
  return Boolean(process.env.TEST_DATABASE_URL);
}

/**
 * Setup: einmal pro Suite (beforeAll).
 * Droppt sebo-Schema komplett, applied alle Migrationen frisch.
 * Idempotent — kann mehrfach aufgerufen werden.
 */
export async function setupTestSchema(): Promise<void> {
  if (schemaReady) return;
  const p = getTestPool();
  if (!p) throw new Error("[test-db] kein Pool — getTestPool() zuerst");

  // Hard-Reset: alle sebo.* Tabellen + Functions weg
  await p.query(`DROP SCHEMA IF EXISTS sebo CASCADE`);

  // Migrations in alphabetischer Reihenfolge anwenden
  const files = readdirSync(sqlDir)
    .filter(f => f.endsWith(".sql") && !f.startsWith("_"))
    .sort();

  for (const f of files) {
    const sql = readFileSync(join(sqlDir, f), "utf8");
    try {
      await p.query(sql);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Migration ${f} fehlgeschlagen: ${msg}`);
    }
  }
  schemaReady = true;
}

/**
 * Schließt den Pool (afterAll).
 * Setzt schemaReady zurück damit nächste Test-Suite frisch aufsetzt.
 */
export async function teardownTestDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    schemaReady = false;
  }
}

/**
 * Helper: führt fn in einer Transaction aus, die am Ende GEROLLBACKT wird.
 * Damit sind Tests isoliert — keine INSERT/UPDATE persistiert.
 *
 * Usage:
 *   it("inserts customer", () => withRollback(async (client) => {
 *     await client.query("INSERT INTO sebo.customers ...");
 *     // assertions
 *   }));
 */
export async function withRollback<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const p = getTestPool();
  if (!p) throw new Error("[test-db] kein Pool");

  const client = await p.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("ROLLBACK");
    return result;
  } finally {
    client.release();
  }
}

/**
 * Convenience: führt eine SQL-Query in Rollback-Transaction aus.
 */
export async function queryInRollback<T extends Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  return withRollback(async (client) => {
    const r = await client.query<T>(sql, params);
    return r.rows;
  });
}
