# Kaspi.kz Payment — Setup-Anleitung

Kaspi.kz ist die mit Abstand wichtigste Zahlungsmethode in Kasachstan
(>60% Marktanteil im Online-Handel). Diese Anleitung beschreibt das
Onboarding und wie der bestehende Stub in echten API-Code umgewandelt wird.

**Aktueller Status:** Stub in `src/lib/payment/kaspi.ts` —
`erstellePaymentLink()` wirft eine "noch nicht implementiert"-Fehler,
bis du Schritte 1–5 abgeschlossen hast.

---

## 1. Merchant-Account beantragen

1. https://kaspi.kz/business → **«Стать партнёром»**
2. Voraussetzungen:
   - ИП oder ТОО (zwingend!)
   - БИН aus dem KZ-Handelsregister
   - Kaspi Gold-Karte für den Verantwortlichen
   - Bankkonto bei Kaspi Bank
3. Vertrag online unterschreiben (digital signature mit ЭЦП)
4. **Wartezeit:** typisch 5–10 Werktage bis Aktivierung

---

## 2. Daten aus Kaspi-Personal-Cabinet sammeln

Nach Aktivierung im Kaspi-Pay-Dashboard (`pay.kaspi.kz`):

| Wert | Wo zu finden |
|---|---|
| **Merchant-ID** | Hauptseite, oben rechts (`MerchantID: 12345`) |
| **Terminal-ID** | Jede Filiale/POS hat eigene ID — für Online: nimm die `ONLINE-001` |
| **API-Key** | Settings → API → "Сгенерировать API-ключ" |
| **Webhook-Secret** | Settings → Webhooks → "Получить секрет" (HMAC-SHA256-Key) |
| **API-Base-URL** | `https://kaspi.kz/api/v2` (Live) / `https://test.kaspi.kz/api/v2` (Sandbox) |

---

## 3. ENV-Variablen setzen

In `.env.local` (auf dem VPS):

```bash
KASPI_MERCHANT_ID=12345
KASPI_TERMINAL_ID=ONLINE-001
KASPI_API_KEY=<DEIN_LIVE_API_KEY>
KASPI_API_BASE=https://kaspi.kz/api/v2
KASPI_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Außerdem im Admin-Panel (`/admin/einstellungen`) den Toggle `kaspi_enabled` auf `true` setzen
(steuert nur die UI-Anzeige im Checkout).

---

## 4. Code aktivieren

`src/lib/payment/kaspi.ts` öffnen und die mit `// TODO:` markierten Blöcke entkommentieren.
Du musst 3 Stellen anpassen:

### 4.1 Payment-Link erstellen (`erstellePaymentLink`)

Endpoint laut Kaspi-API-Doku:
```
POST /v2/payments/qr
Headers:  Authorization: Bearer <KASPI_API_KEY>
          Content-Type: application/json
Body:
{
  "merchant_id":   "<KASPI_MERCHANT_ID>",
  "terminal_id":   "<KASPI_TERMINAL_ID>",
  "amount":        12500,                   // in Tenge (NICHT Tijin!)
  "currency":      "KZT",
  "order_id":      "<dein_order_uuid>",
  "description":   "Galerie du Temps #GDT-1234",
  "return_url":    "https://galeriedutemps.kz/checkout/erfolg/<order_id>",
  "webhook_url":   "https://galeriedutemps.kz/api/kaspi/webhook",
  "customer_phone":"77011234567"            // optional, für Push-Nachricht
}

Response:
{
  "payment_id":   "kp_xxxxx",
  "qr_url":       "https://kaspi.kz/qr/xxxxx",
  "payment_url":  "https://kaspi.kz/pay/xxxxx",
  "expires_at":   "2026-05-25T15:30:00Z"
}
```

### 4.2 Payment-Status abfragen (`pruefePaymentStatus`)

```
GET /v2/payments/<payment_id>/status
Headers: Authorization: Bearer <KASPI_API_KEY>

Response:
{
  "status": "completed" | "pending" | "expired" | "cancelled",
  "paid_at": "2026-05-25T14:32:11Z" | null
}
```

### 4.3 Webhook-Signatur prüfen (`verifyWebhookSignature`)

Kaspi sendet bei jedem Webhook einen Header:
```
X-Kaspi-Signature: hex-encoded HMAC-SHA256
```

Algorithmus:
```typescript
const expected = crypto
  .createHmac("sha256", process.env.KASPI_WEBHOOK_SECRET)
  .update(rawBody)
  .digest("hex");

if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(receivedSignature))) {
  throw new Error("Invalid signature");
}
```

---

## 5. Webhook bei Kaspi registrieren

Kaspi-Dashboard → Settings → Webhooks → **+ Add endpoint**

- **URL:** `https://galeriedutemps.kz/api/kaspi/webhook`
- **Events:**
  - `payment.completed`  ← wichtigster
  - `payment.expired`
  - `payment.cancelled`
- **HTTP-Method:** POST
- **Content-Type:** application/json

Test: in Kaspi-Dashboard "Send test event" → muss in deinen App-Logs auftauchen
mit `200 OK`. Bei `401` ist die Signatur-Prüfung defekt.

---

## 6. Testing mit Sandbox

Vor Live-Schaltung:

```bash
# .env.local temporär:
KASPI_API_BASE=https://test.kaspi.kz/api/v2
KASPI_API_KEY=<DEIN_TEST_API_KEY>

# Testkarten (im Sandbox immer erfolgreich):
#   Kartennummer:  4400 1111 1111 1111
#   CVV:           123
#   Gültigkeit:    beliebig in der Zukunft
```

**Test-Szenarien:**

| Szenario | Erwartung |
|---|---|
| `/api/kaspi/checkout` mit gültigem Cart | `200 OK`, `payment_url` in Response |
| Im Browser-Tab `payment_url` öffnen, Test-Karte eingeben | Redirect zu `/checkout/erfolg/<id>` |
| Webhook trifft ein | `order.status = 'paid'`, `bezahlt_am` gesetzt, E-Mail gesendet |
| Webhook mit falscher Signatur | `401 Unauthorized` |

---

## 7. Live-Schaltung

```bash
# In .env.local:
KASPI_API_BASE=https://kaspi.kz/api/v2
KASPI_API_KEY=<DEIN_LIVE_API_KEY>
KASPI_WEBHOOK_SECRET=whsec_xxxxx   # echtes Live-Secret aus Dashboard

# Container neu starten
docker compose restart app

# Mit echter Karte testen (Mindestbetrag bei Kaspi: 100 KZT)
```

---

## 8. Häufige Fehler

| Fehler | Ursache |
|---|---|
| `"merchant_not_active"` | Vertrag noch nicht freigegeben, ruf Kaspi-Support an (`+7 727 244-43-32`) |
| `"insufficient_funds"` (Sandbox) | Falsche Test-Karte verwendet |
| Webhook kommt nicht an | URL muss HTTPS sein + ohne Self-Signed-Cert. Caddy erledigt das automatisch. |
| `"signature_mismatch"` | Webhook-Secret in .env stimmt nicht mit Dashboard. Auch Whitespace prüfen! |
| Status bleibt `"pending"` | Kunde hat Payment-Link erhalten aber nicht bezahlt — nach 30 Min auto-`"expired"` |

---

## 9. Auszahlung an dein Konto

Kaspi behält **2.5%** Provision auf jeder Transaktion. Auszahlung erfolgt
automatisch täglich (T+1) auf dein verknüpftes Kaspi-Bank-Konto.

Sicht ins Dashboard:
- **Erlöse heute** → `pay.kaspi.kz` → Dashboard
- **Bankkonto-Saldo** → Kaspi-App auf dem Handy
- **Steuerbericht** → Settings → Reports → "Налоговый отчёт" → exportierbar als XLSX
  (für deine ИП/ТОО-Buchhaltung)

---

## 10. Alternativen (für später)

Falls Kaspi-Setup zieht sich oder du multiple Zahlungsoptionen willst:

| Anbieter | Status | Hinweis |
|---|---|---|
| **Stripe** | ✓ schon integriert | Funktioniert in KZ via Karten (Visa/MC), aber **nicht via Kaspi Gold** |
| **CloudPayments** | nicht integriert | RU/KZ-fokussiert, hat auch Kaspi-Plugin |
| **Halyk Pay** | nicht integriert | Zweitgrößter KZ-Provider, eigenes API |
| **Manuelle Überweisung** | ✓ schon im UI | Kunde sieht ИИК/БИК in der Rechnung |

---

## Support-Kontakte

- **Kaspi-Business-Hotline:** +7 727 244-43-32
- **Kaspi-Tech-Support:** business@kaspi.kz
- **API-Doku:** https://guide.kaspi.kz/partner (Login erforderlich)
- **Discord-Community KZ-Devs:** [t.me/kazakhstan_devs](https://t.me/kazakhstan_devs)
