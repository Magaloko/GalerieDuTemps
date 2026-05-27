import { Pool, type PoolClient, type QueryResult } from "pg";

// ---------------------------------------------------------------------------
// PostgreSQL Pool – Singleton mit Lazy Initialization
// Pool wird erst beim ersten echten DB-Aufruf erstellt (nicht beim Importieren).
// So schlägt next build nicht fehl, wenn DATABASE_URL fehlt.
// ---------------------------------------------------------------------------

declare global {
  // Verhindert mehrere Pool-Instanzen im Next.js Dev-Modus (Hot Reload)
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "[DB] DATABASE_URL ist nicht gesetzt. Bitte .env.local prüfen."
    );
  }

  const pool = new Pool({
    connectionString,
    max:                     10,
    idleTimeoutMillis:       30_000,
    connectionTimeoutMillis: 5_000,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });

  pool.on("error", (err) => {
    console.error("[DB] Unerwarteter Pool-Fehler:", err.message);
  });

  if (process.env.NODE_ENV === "development") {
    pool.on("connect", () => console.log("[DB] Neue Verbindung hergestellt"));
  }

  return pool;
}

// Lazy getter – Pool wird erst beim ersten echten Zugriff erstellt
function getPool(): Pool {
  if (process.env.NODE_ENV === "development") {
    return (globalThis._pgPool ??= createPool());
  }
  return (globalThis._pgPool ??= createPool());
}

// ---------------------------------------------------------------------------
// Typisierter Query-Helper
// ---------------------------------------------------------------------------

export async function query<T extends object = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const pool  = getPool();
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    if (process.env.NODE_ENV === "development") {
      console.log(`[DB] ${Date.now() - start}ms »`, text.slice(0, 80));
    }
    return result;
  } catch (err) {
    console.error("[DB] Query-Fehler:", { text: text.slice(0, 120), err });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Transaction-Helper
// ---------------------------------------------------------------------------

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Health-Check (wirft nicht, gibt Fehler als Wert zurück)
// ---------------------------------------------------------------------------

export async function checkDbConnection(): Promise<{
  ok: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    await getPool().query("SELECT 1");
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      ok:        false,
      latencyMs: Date.now() - start,
      error:     err instanceof Error ? err.message : "Unbekannter Fehler",
    };
  }
}

// Kompatibilitäts-Export (für direkten Pool-Zugriff wenn nötig)
export const db = { query, withTransaction, checkDbConnection };

// ---------------------------------------------------------------------------
// Test-Hook — nur für Vitest/Jest. NIEMALS aus App-Code aufrufen.
// Erlaubt Tests einen alternativen Pool (z.B. gegen TEST_DATABASE_URL)
// einzuhängen, ohne dass die App-Funktionen umgebaut werden müssen.
// ---------------------------------------------------------------------------
export function __setPoolForTesting(testPool: Pool | null): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("[DB] __setPoolForTesting() darf NICHT in production!");
  }
  globalThis._pgPool = testPool ?? undefined;
}
