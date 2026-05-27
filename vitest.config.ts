import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Vitest-Konfiguration · Galerie du Temps
 *
 * Aktueller Scope: pure-functions in src/lib/ — keine UI-Tests, keine DB-
 * Integration. Falls später Komponenten-Tests gewünscht: 'environment'
 * auf "jsdom" wechseln und @testing-library/react installieren.
 */
// Vitest 4's TS-Types decken `poolOptions` und `fileParallelism` (am
// Root statt unter browser.*) noch nicht ab, obwohl beide zur Runtime
// existieren. Type-Cast via Record statt brüchige Schema-Workarounds.
type VitestConfig = Record<string, unknown>;

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: ({
    environment: "node",
    globals:     true,
    // DB-Integration-Tests in mehreren Files (db-produkte / db-orders /
    // db-customer-telegram) rufen ALLE `setupTestSchema()` in beforeAll →
    // DROP SCHEMA + CREATE. Vitest spawnt per Default einen Fork PRO
    // Test-File und damit racen die Setups gegen einen geteilten Postgres-
    // Server: "duplicate key value violates pg_type_typname_nsp_index" oder
    // "function sebo.update_aktualisiert_am does not exist" (Migration nur
    // halb sichtbar). Single-Fork serialisiert die Files — pure-function-
    // Tests innerhalb eines Files laufen weiterhin parallel.
    pool: "forks",
    // Vitest 4: pool-options sind jetzt top-level statt nested unter
    // poolOptions.forks. Quelle: vitest.dev/guide/migration#pool-rework
    forks: { singleFork: true },
    // Test-Files sequentiell ausführen — sonst racen die DB-Tests gegen-
    // einander mit DROP SCHEMA + CREATE und produzieren "schema sebo does
    // not exist". Pure-function-Tests profitieren nicht von Parallelität
    // bei dieser Suite-Größe (143 Tests, 4s gesamt).
    fileParallelism: false,
    // Globaler Setup-File: mockt next/cache (revalidateTag / revalidatePath)
    // — sonst werfen die DB-Tests "Invariant: static generation store missing"
    // weil produktErstellen() etc. revalidateTag callen.
    setupFiles: ["src/lib/__tests__/setup-vitest.ts"],
    include:     [
      "src/**/*.{test,spec}.{ts,tsx}",
      // __tests__ — aber NUR *.test.ts/*.spec.ts (Helper-Files wie test-db.ts
      // sollen NICHT als Test-Suite geladen werden, sie haben kein describe()).
      "src/**/__tests__/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: [
      "node_modules",
      ".next",
      "dist",
      "build",
    ],
    coverage: {
      provider:  "v8",
      reporter:  ["text", "html", "json-summary"],
      include:   [
        "src/lib/cart-berechnung.ts",
        "src/lib/payment/methods.ts",
        "src/lib/utils/slug.ts",
        "src/lib/utils/validierung.ts",
      ],
      thresholds: {
        // Für die explizit getesteten Module — andere Files sind aktuell
        // ungetestet und sollen die Schwelle nicht ziehen.
        statements: 80,
        branches:   75,
        functions:  80,
        lines:      80,
      },
    },
  } satisfies VitestConfig) as never,
});
