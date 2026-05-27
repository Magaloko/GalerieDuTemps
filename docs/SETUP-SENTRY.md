# Setup: Sentry Error-Tracking

Sentry erfasst Production-Errors aus Frontend + Backend automatisch.
Aktuell konfiguriert via offizielles `@sentry/nextjs`.

---

## Coolify ENV-Variablen setzen

Im Coolify-Dashboard → App → **Environment Variables**:

```bash
# Public-DSN (Client + Server lesen das)
NEXT_PUBLIC_SENTRY_DSN=https://c526e3c5be77adee3fd431717e211b76@o4511464009629696.ingest.de.sentry.io/4511464016183376
SENTRY_DSN=https://c526e3c5be77adee3fd431717e211b76@o4511464009629696.ingest.de.sentry.io/4511464016183376

# Org + Project (für Source-Map-Upload — frag Sentry-Settings ab)
SENTRY_ORG=dein-org-slug
SENTRY_PROJECT=dein-project-slug

# Auth-Token (Build-Time, GEHEIM — als "Is Build Time? = ja" markieren!)
SENTRY_AUTH_TOKEN=sntrys_eyJ...
```

**Wichtig**: `SENTRY_AUTH_TOKEN` MUSS als "Build Variable" markiert werden,
sonst wird er beim Source-Map-Upload während `next build` nicht gefunden.

### Auth-Token erstellen

1. https://sentry.io → **User Settings → Auth Tokens → Create New Token**
2. Name: `galeriedutemps-build`
3. Scopes:
   - ✅ `project:releases`
   - ✅ `org:read`
4. Save → Token **EINMALIG** anzeigen → in Coolify einfügen

---

## Was wird erfasst?

### Automatisch
- **JS-Errors** im Browser (uncaught + Promise-Rejections)
- **Server-Errors** in API-Routes, Server-Actions, Server-Components
- **Performance-Traces** (10% Sample-Rate in prod): DB-Queries, fetches, page-loads
- **Session-Replays** bei Errors (Video-Replay des User-Verhaltens vor dem Crash)

### Gefiltert (wird NICHT erfasst)
- `ResizeObserver`-Loops (Browser-Quirk)
- Errors von `instagram.com/embed.js` (Third-Party)
- `ZodError` (bewusst geworfen für Validierung)
- `NEXT_NOT_FOUND` + `NEXT_REDIRECT` (Routing-Mechanismen)
- Browser-Extension-Errors

### PII-Scrubbing
Beim Server-Send werden automatisch gescrubbt:
- `password`, `passwort`
- `iban`, `kartennummer`, `cvc`
- `telegram_chat_id`
- Stripe-Secret-Keys (`sk_live_*`, `sk_test_*`)

---

## Verifikation

Nach erstem Deploy mit ENV-Vars:

1. **Sentry-Test-Endpoint** (Admin-only):
   ```
   GET https://galerie.apps.dadakaev.tech/api/sentry-test
   ```
   Wirft einen kontrollierten Error → sollte in **Sentry Issues** auftauchen (~30 Sek)

2. **Client-Test** (Console):
   ```js
   throw new Error("Client-Test")
   ```
   In DevTools-Console eingeben → auftauchen in Sentry

3. **Replay-Test**: einen Fehler triggern, danach in Sentry-Issue → "Replays" Tab → Session-Video anschauen

---

## Konfigurations-Dateien

| File | Zweck |
|------|-------|
| `src/instrumentation.ts` | Next.js Hook — registriert Sentry auf Server-Start |
| `src/instrumentation-client.ts` | Client-Side init (Replay + Tracing) |
| `sentry.server.config.ts` | Node.js Runtime (API-Routes, Server-Actions) |
| `sentry.edge.config.ts` | Edge Runtime (Middleware/proxy.ts) |
| `src/app/global-error.tsx` | Root-Level Error-Boundary mit `Sentry.captureException` |
| `next.config.ts` | `withSentryConfig` Wrap für Source-Map-Upload |

---

## Tunnel-Route `/monitoring`

Sentry-Events werden über `/monitoring` Proxy gesendet — umgeht uBlock/AdBlock-Plus die direkten Sentry-Requests blockieren würden. Macht es transparent für Customer-Side-Errors.

Wenn du in proxy.ts ein restriktives Matcher-Array hast: **NICHT** `/monitoring` blockieren (ist aktuell schon ausgeschlossen weil Matcher whitelist-basiert).

---

## Sampling-Raten anpassen

In `sentry.server.config.ts` und `instrumentation-client.ts`:

```ts
tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
//                                                              ^^^
//                                                              ↑ 10% prod
//                                                              höher = mehr Traces = mehr Quota
```

Free-Tier hat: **5,000 Errors + 10,000 Performance + 50 Replays / Monat**.
Bei Bedarf: höher samplen oder Pro-Plan ($26/Monat für 50k Errors).

---

## Bekannte Issues silencen

Wenn ein bestimmter Error spammt aber nicht actionable ist:

```ts
// In sentry.server.config.ts oder instrumentation-client.ts
ignoreErrors: [
  // ...existing
  "Dein neuer zu ignorierender Error-Pattern",
  /regex-pattern/,
],
```

Push + Redeploy → Sentry filtert ihn raus.
