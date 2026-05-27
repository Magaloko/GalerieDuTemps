# Tests · Galerie du Temps

[![Test](https://github.com/Magaloko/GalerieDuTemps/actions/workflows/test.yml/badge.svg)](https://github.com/Magaloko/GalerieDuTemps/actions/workflows/test.yml)
[![Build](https://github.com/Magaloko/GalerieDuTemps/actions/workflows/build.yml/badge.svg)](https://github.com/Magaloko/GalerieDuTemps/actions/workflows/build.yml)

Setup: **Vitest 4** + V8-Coverage. Pure Node-Runner (kein jsdom), nur
Pure-Functions in `src/lib/` werden getestet.

## Kommandos

```bash
npm test               # einmal laufen, Exit-Code 1 bei Failures
npm run test:watch     # Watch-Mode für lokales Entwickeln
npm run test:coverage  # mit Coverage-Report (html + json-summary in /coverage)
```

## Aktueller Stand

```
4 Test-Files · 100 Tests · 100% statements / 97% branches auf den
4 getesteten Modulen
```

### Getestete Module

| Modul | Tests | Coverage | Was geschützt ist |
|---|---|---|---|
| `src/lib/cart-berechnung.ts` | 15 | 100% / 92% | Steuer-Berechnung, Rabatt-Verteilung, Versand-Tax, Rounding-Stabilität, KZT-12%-Spezialfall, Multi-Tax-Breakdown, Boundary (subtotal=0, rabatt>subtotal) |
| `src/lib/payment/methods.ts` | 24 | über die Test-Routen abgedeckt | Registry-Completeness, isMethodAvailable (Lieferland-Filter + envCheck), providerEnvOk pro Provider, Payment-Reference-Format |
| `src/lib/utils/slug.ts` | 27 | über generateSlug/uniqueSlug | DE-Umlaute, FR-Akzente, RU-Transliteration, KZ-Spezial-Buchstaben (ә ғ қ ң ө ұ ү һ і), Emoji/Chinesisch-Fallback, 200-Zeichen-Limit, Underscore-Handling **(Bug gefunden + gefixt)** |
| `src/lib/utils/validierung.ts` | 34 | über alle 4 Schemas | ProduktCreateSchema (Pflichtfelder, Limits, Tag-Coercion), KategorieCreate, BildUpdate, Paginierung |

### Bug-Fund

**`generateSlug("my_product")` → `"myproduct"`** (statt `"my-product"`).
Underscore wurde vom Whitelist-Regex entfernt bevor er zu Hyphen
umgewandelt werden konnte. **Gefixt im selben Commit** wo die Tests
hinzukamen.

## Konventionen für neue Tests

### Datei-Ablage

```
src/lib/__tests__/<modulname>.test.ts   ← bevorzugt
src/lib/<modulname>.test.ts             ← OK wenn neben dem Modul
```

Beides wird vom `vitest.config.ts` aufgenommen.

### Imports

```typescript
import { describe, it, expect } from "vitest";
import { meineFunktion } from "@/lib/...";  // @-Alias funktioniert
```

Bei ENV-Tests:
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

beforeEach(() => vi.stubEnv("STRIPE_SECRET_KEY", ""));
afterEach(() => vi.unstubAllEnvs());
```

### Was getestet werden sollte

- ✅ **Pure Funktionen** (keine DB, kein Netzwerk, keine globalen Mutations)
- ✅ **Validation-Logic** (Zod-Schemas, RegEx-Whitelists)
- ✅ **Berechnungen** (Tax, Rabatt, Currency-Konvertierung)
- ✅ **Transformationen** (Slug, Sanitize, Format)

### Was NICHT in dieser Test-Welle ist

- ❌ DB-Queries (würden Live-Postgres oder Mock-Setup brauchen)
- ❌ API-Routes (würden Auth-Mocking + Request/Response-Helper brauchen)
- ❌ React-Komponenten (jsdom + @testing-library/react nötig)
- ❌ Server-Actions mit Side-Effects (revalidatePath etc.)
- ❌ E2E (Playwright wäre separater Aufbau)

## DB-Layer-Tests (Welle 2 · live)

Eigene Test-Klasse die nur läuft wenn `TEST_DATABASE_URL` gesetzt ist
(NICHT `DATABASE_URL` — das ist Production/Dev). Tests legen das Schema
frisch an und nutzen Rollback-Transactions für Isolation.

### Lokal mit Docker

```bash
docker run --name pg-test -e POSTGRES_PASSWORD=test -p 5433:5432 -d postgres:16

# Windows PowerShell:
$env:TEST_DATABASE_URL="postgresql://postgres:test@localhost:5433/postgres"
# bash/zsh:
export TEST_DATABASE_URL="postgresql://postgres:test@localhost:5433/postgres"

npm test   # 100 pure + 24 DB Tests laufen
```

### Lokal mit Supabase-Test-Projekt

1. supabase.com → neues Projekt (NUR für Tests, NICHT Production)
2. Settings → Database → Connection String
3. `export TEST_DATABASE_URL="postgresql://..."`
4. `npm test` — Schema wird gedroppt + neu aufgesetzt

### Was getestet wird (24 DB-Tests)

| Modul | Tests | Bereich |
|---|---|---|
| `db/produkte.ts` | 9 | Slug-Collision-Handling, auto-`artikel_code`, i18n-JSONB, tags-ARRAY, Cyrillic-Transliteration end-to-end |
| `db/orders.ts` | 4 | **Atomare Stock-Reservation** (Codex' a602bad Fix), concurrent UPDATE-Races, Transaction-Rollback bei Multi-Item-Cart |
| `db/customer-telegram.ts` | 11 | Token-Generation, einmalige Einlösung (race-safe), Cross-Customer-Schutz, UNIQUE chat_id, Notifications-Toggle |

### Ohne `TEST_DATABASE_URL`

```
$ npm test
 ✓ pure-function tests   (100 passed)
 ↓ db tests              (26 skipped)
```

Skip ist by-design — verhindert dass jemand versehentlich gegen die
Production-DB testet.

### Sicherheits-Guards

- `test-db.ts` wirft Error wenn URL `supabase.co` enthält ohne `test`
- Wirft Error wenn `TEST_DATABASE_URL === DATABASE_URL` (Dev-DB-Schutz)
- Schema-Reset macht `DROP SCHEMA sebo CASCADE` — alle sebo-Daten weg
- `__setPoolForTesting()` in `src/lib/db/index.ts` wirft `Error` wenn
  `NODE_ENV === "production"`

## CI · GitHub Actions

Zwei Workflows triggern automatisch bei Push zu `main` und bei Pull-Requests:

| Workflow | Datei | Was läuft |
|---|---|---|
| **Test** | `.github/workflows/test.yml` | Vitest gegen Postgres-16-Service-Container, **alle 124 Tests** (100 pure + 24 DB-Integration). Coverage-Report als Artifact (14 Tage Retention). |
| **Build** | `.github/workflows/build.yml` | TypeScript `tsc --noEmit` + `next build`. Verifiziert dass Production-Bundle kompiliert. |

### Postgres-Service im Test-Workflow

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_PASSWORD: test
      POSTGRES_DB:       galerie_test
    ports: ["5432:5432"]
    options: --health-cmd pg_isready --health-interval 5s
```

`TEST_DATABASE_URL=postgresql://postgres:test@localhost:5432/galerie_test`
ist als Job-ENV gesetzt → DB-Integration-Tests greifen automatisch.

### Coverage-Artifact herunterladen

GitHub → Actions → Test-Workflow-Run → unten **Artifacts** → `coverage-report`
→ `index.html` lokal öffnen.

### Status-Badge

Badges oben in TESTS.md zeigen den letzten Test/Build-Status auf `main`.
Bei rotem Badge → CI hat Test-Failure oder Build-Error.

## Roadmap für weitere Test-Wellen

1. **API-Routes-Tests** mit Auth-Mock + Request-Helper
2. **React-Component-Tests** mit jsdom + @testing-library
3. **E2E** mit Playwright (Cart→Order→Payment durchspielen)

## Coverage-Schwellen

In `vitest.config.ts`:
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

Aktuell deutlich übertroffen (100/97/100/100). Schwellen gelten nur
für die explizit gelisteten 4 Module in `coverage.include` —
restliches `src/` ist NICHT in der Threshold-Berechnung, um neue
ungetestete Module nicht falsch zu bestrafen.

## CI-Integration (TODO)

Aktuell laufen Tests nur lokal. Für GitHub-Actions später:

```yaml
# .github/workflows/test.yml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm test
      - run: npm run build  # type-check + production-build
```
