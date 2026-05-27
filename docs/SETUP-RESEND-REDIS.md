# Setup: Resend + Redis (Upstash)

Step-by-step Anleitung für die Anbindung von **Resend** (Email-Versand) und
**Upstash Redis** (Caching, Rate-Limiting, Sessions, Queue) an Galerie du Temps.

---

## 1. Resend Email-Provider

### 1.1 Account + API-Key

1. Account auf https://resend.com/signup anlegen (Free-Tier reicht: 3.000 Emails/Monat, 100/Tag)
2. **API Keys** → **Create API Key**
   - Name: `galeriedutemps-production`
   - Permission: **Sending access**
   - Domain: noch nicht zugewiesen — kann später eingestellt werden
3. Key kopieren (beginnt mit `re_`) — wird **nur einmal angezeigt**, sicher abspeichern

### 1.2 Domain verifizieren — galeriedutemps.kz

**Ohne Domain-Verifikation kann Resend keine Mails von `@galeriedutemps.kz` senden.**

1. Resend Dashboard → **Domains** → **Add Domain**
2. Domain: `galeriedutemps.kz` eingeben → **Add**
3. Resend zeigt 3 DNS-Records:
   ```
   Type  Name                     Value
   TXT   _amazonses.send          (langer string)
   MX    send                     feedback-smtp.eu-west-1.amazonses.com (Priorität 10)
   TXT   _dmarc                   v=DMARC1; p=none;
   ```

4. **Bei deinem DNS-Provider** (z.B. Cloudflare, Namecheap) diese 3 Records anlegen:
   - Bei Cloudflare: **DNS → Records → Add record** für jeden
   - Wichtig: **Proxy AUS** (graue Wolke) bei den Resend-Records — die müssen direkt aufgelöst werden

5. Zurück in Resend → **Verify** klicken. Propagation kann 5-30 Minuten dauern.

6. Status zeigt **„Verified"** → fertig

### 1.3 ENV-Variablen setzen

In **Coolify** unter deinem App-Service → **Environment Variables** → folgende ENV setzen:

```
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_dein_neuer_key_hier
EMAIL_FROM=noreply@galeriedutemps.kz
EMAIL_FROM_NAME=Galerie du Temps
```

Brevo-Keys können bleiben (Fallback wenn EMAIL_PROVIDER zurück auf `brevo` gesetzt wird).

Lokal (für Tests):

```bash
# .env.local
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_dein_test_key
EMAIL_FROM=noreply@galeriedutemps.kz
EMAIL_FROM_NAME=Galerie du Temps
```

### 1.4 Verifizieren

```bash
# Lokal Test-Send:
curl -X POST http://localhost:3000/api/health/infra | jq
# Sollte zeigen: "email": { "provider": "resend", "configured": true }
```

Echter Send-Test: nutze das Kontakt-Formular auf `/kontakt`. Du bekommst Mail an `EMAIL_FROM`.

---

## 2. Upstash Redis

### 2.1 Account + Datenbank

1. Account auf https://console.upstash.com/login (Google/GitHub-OAuth)
2. **Create Database**
   - Name: `galeriedutemps-prod`
   - Type: **Regional** (Pay-as-you-go ist günstiger, aber wenn Free Tier ausreicht → Regional Free)
   - Region: **eu-central-1** (Frankfurt, nahe Kasachstan-Geo) oder **eu-west-1** (Irland)
   - TLS: **Enabled** (default)
3. **Create** klicken

### 2.2 Connection-URL kopieren

In der erstellten DB → **Details**-Reiter:

- Suche **„Redis TCP"** Sektion (NICHT REST!) — wir nutzen TCP für ioredis-Kompatibilität
- Es gibt **Endpoint, Port, Password** — und gleich darunter eine **Connection String** Box
- Kopiere die `rediss://`-URL (mit doppeltem `s` — wichtig für TLS!)

Format:
```
rediss://default:AaXXXXX...@xxxxx-xxx-12345.upstash.io:6379
```

### 2.3 ENV setzen

Coolify ENV:

```
REDIS_URL=rediss://default:DEIN_TOKEN@DEIN-ENDPOINT.upstash.io:6379
```

Lokal:

```bash
# .env.local
REDIS_URL=rediss://default:DEIN_TOKEN@DEIN-ENDPOINT.upstash.io:6379
```

> 💡 **Lokal mit Docker statt Upstash:**
> ```bash
> docker run -d --name redis-dev -p 6379:6379 redis:7-alpine
> # .env.local: REDIS_URL=redis://localhost:6379  (kein doppeltes s — kein TLS)
> ```

### 2.4 Verifizieren

```bash
curl http://localhost:3000/api/health/infra | jq
# "redis": { "configured": true, "connected": true } → 
```

---

## 3. Was wird automatisch genutzt?

Sobald `REDIS_URL` gesetzt ist, aktivieren sich:

### Caching (sofort)

| Use-Case | TTL | Key |
|---------|-----|-----|
| Wechselkurse | 1h | `gdt:wechselkurse:all` |
| (mehr Caching: einfach `cached()`-Wrapper in DB-Funktionen einbauen) | | |

Im Code: `import { cached } from "@/lib/redis/cache"` → siehe `src/lib/db/wechselkurse.ts` als Beispiel.

### Rate-Limiting

Bestehende Calls von `rateLimitPruefen()` (in-memory) bleiben unverändert.
**Neue Calls** sollten `rateLimitAsync()` nutzen — der nutzt Redis automatisch wenn verfügbar:

```ts
import { rateLimitAsync, tooManyRequestsResponse, getClientIp } from "@/lib/utils/rate-limit";

const ip = getClientIp(req);
const rl = await rateLimitAsync(`my-endpoint:${ip}`, 10, 60_000);
if (!rl.erlaubt) return tooManyRequestsResponse(rl);
```

### Session-Store (für Cart-Sync, Quiz-Antworten)

`src/lib/redis/session-store.ts` bietet:

```ts
import { newGuestId, sessionGet, sessionSet, sessionUpdate } from "@/lib/redis/session-store";

// Neue Guest-Session anlegen (z.B. in middleware.ts wenn kein Cookie):
const guestId = newGuestId();
// → in HTTP-only Cookie speichern

// Cart-Daten lesen/schreiben:
const cart = await sessionGet<CartState>(guestId);
await sessionUpdate(guestId, { items: [...neuItems] });
```

TTL: 30 Tage rolling (jeder Read verlängert).

### Queue (BullMQ) — optional, manueller Setup

Für Newsletter-Mass-Sends + KI-Background-Tasks kann später BullMQ aktiviert werden:

```bash
npm install bullmq
```

Das ist noch nicht ausgerollt — wir bauen das in einer separaten Welle wenn du Newsletter-Versand mit > 1000 Empfängern brauchst.

---

## 4. Health-Check für Coolify

`GET /api/health/infra` gibt JSON zurück mit Status für Postgres, Redis, Email-Provider.

In Coolify:
- App-Service → **General** → **Health Check Path**: `/api/health/infra`
- Erwarteter HTTP-Code: `200` (`503` wenn ein Service down ist)

Bei Healthcheck-Fehler: Coolify zeigt rotes Symbol → triggert ggf. Restart oder Alert.

---

## 5. Migration: Brevo → Resend

Wenn alles auf Resend laufen soll:

1. Domain verifiziert (Schritt 1.2)
2. ENV gesetzt (Schritt 1.3)
3. App in Coolify **redeployen** (sonst zieht neue ENV nicht)
4. Test: Kontaktformular auf `/kontakt` → Mail kommt an

**Rollback:** Falls Resend Probleme macht, einfach `EMAIL_PROVIDER=brevo` in Coolify und redeploy. Brevo-Code bleibt funktionsfähig.

---

## 6. Kostenüberblick

### Resend
- Free: 3.000 Mails/Monat, 100/Tag → für Galerie du Temps wahrscheinlich ausreichend in der Anlaufphase
- Pro: $20/Monat für 50.000 Mails/Monat → ab ~3.000 Mails/Monat lohnenswert
- **Galerie du Temps Anlaufphase** (geschätzt 100-500 Mails/Monat): Free Tier reicht

### Upstash Redis
- Free: 10.000 Commands/Tag, 256MB DB-Size
- Pay-as-you-go: $0.2 pro 100k commands danach
- **Galerie du Temps Anlaufphase**: Free Tier reicht (jede Page-View triggert ~3-5 Redis-Commands)

---

## 7. Troubleshooting

### Resend: „Domain not verified"
- DNS-Propagation kann bis zu 24h dauern (meist 5-30 Min)
- Prüfe: `dig TXT _amazonses.send.galeriedutemps.kz` → sollte den Resend-Wert zurückgeben
- Cloudflare: Proxy (graue Wolke) muss **AUS** sein

### Redis: „ECONNRESET" oder „ENOTFOUND"
- Upstash: TLS-URL muss mit `rediss://` (doppeltes s) anfangen
- Self-hosted: kann `redis://` sein (einfaches s, ohne TLS)
- Fehler bei lazyConnect ist normal — Redis verbindet erst beim ersten Call

### Email kommt nicht an
- Spam-Ordner check
- `/api/health/infra` zeigt was konfiguriert ist
- Resend Dashboard → **Logs** zeigt jeden Send-Versuch mit Detail-Error

---

## Anhang: Code-Pfade

```
src/lib/email/
  index.ts           ← Provider-Switcher (NEU)
  types.ts           ← gemeinsame Types
  brevo.ts           ← Brevo-Client
  resend.ts          ← Resend-Client (NEU)
  templates/         ← bestehend
  affiliate-templates.ts
  customer-templates.ts

src/lib/redis/
  index.ts           ← Singleton-Client (NEU)
  cache.ts           ← cached(), cacheGet/Set/Del (NEU)
  rate-limit.ts      ← Redis-backed Rate-Limit (NEU)
  session-store.ts   ← Guest-Session-Store (NEU)

src/lib/utils/rate-limit.ts ← Sync + Async-API (REFACTORED)

src/app/api/health/infra/route.ts ← Diagnostic Endpoint (NEU)
```
