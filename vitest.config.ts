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
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    globals:     true,
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
  },
});
