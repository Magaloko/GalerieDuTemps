# Datenbank-Health-Check

Umfassendes CLI-Tool um die komplette Postgres-Datenbank zu prüfen.

## Quick Start

```bash
# Gegen Production-DB (DATABASE_URL aus .env.local oder Umgebung)
npm run db:check

# Gegen Test-DB (TEST_DATABASE_URL)
npm run db:check -- --test

# JSON-Report (für CI / Monitoring)
npm run db:check:json > db-report.json

# Nur einen Bereich prüfen
npm run db:check -- --section schema   # Schema-Integrität
npm run db:check -- --section data     # Daten-Integrität
npm run db:check -- --section stats    # Statistiken
```

Exit-Code: `0` wenn alles OK, `1` wenn Probleme gefunden.

## Was wird geprüft?

### 1. Schema-Integrität
- **`sebo`-Schema existiert?** — verhindert komplette DB-Korruption
- **`sebo.schema_migrations` existiert?** — Migration-Tracking-Tabelle da?
- **Tracking-Orphans** — Migrationen in DB ohne passende SQL-Datei (heißt: jemand hat eine Datei gelöscht ohne den Eintrag zu entfernen)
- **Pending Migrations** — SQL-Files die noch nicht angewendet wurden
- **SHA256-Drift** — wurde eine Migration nach Apply editiert? (kritisch — Code & DB driften auseinander)
- **Kern-Tabellen** — alle ~20 essenziellen Tabellen (`benutzer`, `produkte`, `orders`, `customers`, …) vorhanden?

### 2. Daten-Integrität
- **Foreign-Key-Orphans** — automatisch über ALLE FK-Constraints im `sebo`-Schema: gibt es Records mit FK auf einen nicht-existenten Parent? (sollte unmöglich sein wenn FK-Constraints aktiv, aber check)
- **Sequence-Drift** — alle Sequenzen mit verdächtig niedrigen Werten?
- **Duplikate in schema_migrations** — sollte durch Primary Key unmöglich sein, aber wir prüfen es

### 3. Statistik
- **Row-Counts** — Top-10 Tabellen nach Größe (schnelle Schätzung via `pg_class.reltuples`)
- **Tabellen-Größen** — Heap + Indizes + Gesamt
- **DB-Gesamtgröße** — wichtig für Supabase-Plan-Tracking
- **Ungenutzte Indizes** — `idx_scan = 0` Indizes (kann auf "totes" Index hindeuten)
- **Cache-Hit-Ratio** — sollte > 0.99 sein. Niedriger = DB zu klein für Workload

## Beispiel-Output

```
✦ galeriedutemps · DB-Health-Check
  Ziel: postgresql://postgres:***@db.xxx.supabase.co:5432/postgres
  Zeit: 2026-05-27T18:00:00.000Z

┌─ 1. SCHEMA-INTEGRITÄT ─────────────────────────────────────────────
  ✓ sebo_schema_existiert
  ✓ schema_migrations_tabelle
  ✓ tracking_orphan_db: keine Orphan-Einträge
  ✓ tracking_pending_files: alle 28 Migrationen sind angewendet
  ✓ migration_sha_drift: keine Drifts
  ✓ kern_tabellen: alle 19 Kern-Tabellen vorhanden (Gesamt: 42)

┌─ 2. DATEN-INTEGRITÄT ──────────────────────────────────────────────
  ✓ fk_orphans: 18 FK-Constraints sauber
  ✓ sequence_drift: 7 Sequenzen OK
  ✓ schema_migrations_dup

┌─ 3. STATISTIK ─────────────────────────────────────────────────────
  Top-Tabellen nach geschätzter Row-Anzahl:
       12453  events
        3421  produkte
         892  orders
         ...

  Top-Tabellen nach Größe:
    GESAMT     HEAP       INDIZES    TABELLE
    18 MB      12 MB      6 MB       events
    8 MB       5 MB       3 MB       produkte
    ...

  Datenbank-Gesamtgröße: 124 MB
  ◇ ungenutzte_indizes: 3 Indizes wurden noch nie verwendet (kann normal sein bei frischer DB)
  ✓ cache_hit_ratio: 0.9987 (gut, > 0.99 ist optimal)

────────────────────────────────────────────────────────────────────
✓ ALLE CHECKS BESTANDEN
```

## Wann ausführen?

- **Nach jedem Production-Deploy** — verifiziert dass die Migrationen sauber durchgelaufen sind
- **Wöchentlich** — fängt schleichende Probleme (Cache-Ratio sinkt, ungenutzte Indizes)
- **Vor größeren Schema-Änderungen** — Snapshot des „Vorher"-Zustands
- **Wenn etwas komisch ist** — schneller First-Look ohne psql

## Was tun bei Fehlern?

| Fehler | Bedeutung | Aktion |
|--------|-----------|--------|
| `tracking_orphan_db` | DB hat Migration-Eintrag ohne Datei | SQL-Datei wurde gelöscht — Eintrag manuell aus `sebo.schema_migrations` entfernen ODER Datei wiederherstellen |
| `tracking_pending_files` | SQL-Datei nicht angewendet | `npm run db:migrate` ausführen |
| `migration_sha_drift` | Datei wurde nach Apply editiert | **Gefährlich**: Code & DB driften! Entweder Datei zurückrollen, oder mit `--force` re-applyen (wenn idempotent) |
| `fk_orphans` | FK-Verletzungen in Daten | Orphans manuell löschen ODER FK-Parent wiederherstellen — vorher `BACKUP` |
| `cache_hit_ratio` < 0.95 | DB zu klein | Supabase-Plan upgraden ODER weniger queries machen |

## CI-Integration (optional)

In `.github/workflows/db-check.yml`:

```yaml
- name: DB Health Check
  run: npm run db:check
  env:
    DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
```

Bei Exit-Code 1 schlägt CI fehl — Alarm in Slack/Email konfigurierbar.

## Erweitern

Neue Checks einfach in `scripts/db-check.mjs` hinzufügen — folge dem Pattern:

```js
const { rows } = await client.query(`SELECT … FROM sebo.… WHERE …`);
if (problemBedingung) {
  fail("category", "check_name", "Beschreibung");
} else {
  pass("category", "check_name", "optionale Info");
}
```

Bestehende Kategorien: `schema`, `data`, `stats`.
