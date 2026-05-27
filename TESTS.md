# Tests · Galerie du Temps

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

## Roadmap für weitere Test-Wellen

1. **DB-Layer mit Test-DB**: Postgres-Testcontainer (Docker), separate
   Test-Schema, Transactional-Rollback nach jedem Test
2. **API-Routes**: Request/Response-Mock, Auth-Helper-Mock,
   `vi.mock("@/lib/auth/config")` für `auth()`-Stub
3. **React-Components**: `@testing-library/react` + jsdom-Environment für
   Mobile-Drawer, Cart-Client, Method-Picker
4. **E2E** mit Playwright: Cart → Order → Method-Picker → Bank-Confirm

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
