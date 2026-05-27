import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlDir    = join(__dirname, "..", "..", "..", "sql");

/**
 * SQL-Migration-Robustheits-Tests.
 *
 * Diese Tests verhindern, dass jemand versehentlich:
 *  - Zwei Migration-Files mit demselben Nummern-Präfix anlegt
 *    (z.B. zwei "021_" Files — die alphabetische Sort-Reihenfolge
 *    würde dann von dem Suffix abhängen und ist nicht offensichtlich)
 *  - Eine Lücke in der Sequenz lässt (z.B. 020, 022 ohne 021)
 *  - Ein File mit ungültigem Format committet (kein NNN_ Präfix)
 *
 * Wenn ein Test fehlschlägt, ist die Migrations-Ordnung NICHT mehr
 * vorhersagbar — d.h. der Build/Test/Deploy wird fragil.
 */
describe("SQL-Migrationen — Sequenz-Robustheit", () => {
  // Alle relevanten Migration-Files (keine _APPLY_*, kein _supabase_combined)
  const files = readdirSync(sqlDir)
    .filter(f => f.endsWith(".sql") && !f.startsWith("_"))
    .sort();

  it("hat mindestens eine Migration-Datei", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("jede Migration folgt dem Format NNN_<name>.sql (3-stellig)", () => {
    const invalid = files.filter(f => !/^\d{3}_[a-z0-9_]+\.sql$/.test(f));
    expect(invalid, `Migrationen mit ungültigem Namens-Format:\n${invalid.join("\n")}`)
      .toEqual([]);
  });

  it("hat KEINE doppelten Nummern-Präfixe", () => {
    const prefixes = files.map(f => f.slice(0, 3));
    const counts = new Map<string, string[]>();
    for (let i = 0; i < files.length; i++) {
      const p = prefixes[i]!;
      counts.set(p, [...(counts.get(p) ?? []), files[i]!]);
    }
    const duplicates = [...counts.entries()].filter(([, arr]) => arr.length > 1);
    expect(
      duplicates,
      `Doppelte Migrations-Nummern gefunden (das macht Sort-Reihenfolge fragil!):\n` +
        duplicates.map(([p, arr]) => `  ${p}: ${arr.join(", ")}`).join("\n"),
    ).toEqual([]);
  });

  it("hat lückenlose Sequenz (000, 001, 002, … ohne Gaps)", () => {
    const prefixes = files.map(f => parseInt(f.slice(0, 3), 10));
    const expected = Array.from({ length: prefixes.length }, (_, i) => i);
    const missing: number[] = [];
    for (const e of expected) {
      if (!prefixes.includes(e)) missing.push(e);
    }
    expect(
      missing,
      `Lücken in der Migrations-Sequenz: ${missing.map(n => String(n).padStart(3, "0")).join(", ")}`,
    ).toEqual([]);
  });

  it("Bootstrap (000_schema_migrations.sql) existiert als allererste Migration", () => {
    expect(files[0]).toBe("000_schema_migrations.sql");
  });
});
