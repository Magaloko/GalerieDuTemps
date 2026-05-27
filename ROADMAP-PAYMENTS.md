# Roadmap · Multi-Provider Payment-Hub

## Status

| # | Methode | Status | Endpoint |
|---|---------|--------|----------|
| 1 | Stripe-Card (vorhanden, alter Flow) | ✅ live | `/api/checkout` (legacy) |
| 2 | Telegram-Payments (Mini-App) | ✅ live | `/api/telegram/checkout` |
| 3 | KASPI (KZ-spezifisch, vorhanden) | ✅ live | `/api/kaspi/checkout` |
| 4 | **Bank-Transfer** | ✅ implementiert | `/api/checkout/bank-transfer` |
| 5 | **Vor-Ort (Pickup, keine Online-Zahlung)** | ✅ implementiert | `/api/checkout/vor-ort` |
| 6 | **Method-Picker UI** | ✅ live | `/checkout/zahlung` |
| 7 | PayPal | 📋 geplant Iter 2 | `/api/checkout/paypal` (Stub vorbereitet) |
| 8 | Crypto (NowPayments) | 📋 geplant Iter 2 | `/api/checkout/crypto` (Stub vorbereitet) |
| 9 | Vor-Ort + Anzahlung | 📋 geplant Iter 2 | `/api/checkout/anzahlung` (Stub vorbereitet) |

## Sicherheits-Notiz

⚠ **Bot-Token-Sharing**: wenn ein Telegram-Bot-Token jemals in einem
öffentlichen Kanal (Chat-Log, GitHub-Issue, Screenshot) aufgetaucht ist:

1. @BotFather → `/revoke` → Bot wählen → neuer Token wird ausgegeben
2. Alter Token wird sofort ungültig — niemand kann mehr im Namen des Bots
   Nachrichten senden oder Webhooks setzen
3. Neuen Token in `/admin/einstellungen/telegram` einfügen (NICHT im Code,
   nicht in ENV-Variablen die im Repo dokumentiert sind)

## Iteration 1 abgeschlossen

### Was läuft jetzt

- Migration `sql/027_payment_methods.sql` erweitert `sebo.orders` um
  `payment_method`, `payment_status`, `payment_meta`, `anzahlung_cents`,
  `payment_reference`. Plus 8 Marketing-Strings für Bank-Daten + Vor-Ort.
- `src/lib/payment/methods.ts`: Registry aller 9 Methoden mit i18n-Labels,
  Provider-Env-Check, Lieferland-Filter.
- `src/lib/db/order-payment.ts`: Helper für `orderSetPaymentMethod` und
  `orderSetPaymentStatus` (trennt order.status von payment_status).
- UI: `/checkout/zahlung?order=<uuid>` zeigt Method-Picker mit Radio-Karten,
  filtert Methoden nach Lieferland + Provider-Env.
- Bank-Confirm: `/checkout/zahlung/bank` zeigt Bank-Daten + Reference-Code
  + Copy-Button für Verwendungszweck.
- Vor-Ort-Confirm: `/checkout/zahlung/vor-ort` zeigt Adresse,
  Öffnungszeiten, Reserve-Bis-Datum.

### Was Admin noch braucht

1. **Migration ausführen**: `npm run db:migrate` in Coolify
2. **Bank-Daten eintragen**: Admin → Einstellungen → Marketing-Texte →
   `payment.bank.iban`, `payment.bank.bic`, `payment.bank.kontoinhaber`,
   `payment.bank.bank_name` mit echten Werten überschreiben
3. **Galerie-Adresse**: `payment.vor_ort.adresse`,
   `payment.vor_ort.oeffnungszeiten` editieren
4. **Bank-Transfer-Bestätigungs-UI im Admin** (eigene Aufgabe): Admin
   sieht im `/admin/bestellungen` die mit `payment_status='pending'` +
   `payment_method='bank_transfer'`. Button „Zahlung erhalten" setzt
   `payment_status='paid'` + ruft `orderStatusUpdate(id, 'paid')` →
   triggert notifyOrderPaid (Telegram-Push) und Customer kann versendet
   werden.

## Iteration 2 (geplant)

### 7. PayPal

**Lib-Empfehlung**: Direkt PayPal REST API (kein SDK nötig), 2 Calls:
- `POST /v2/checkout/orders` mit `intent=CAPTURE` + Line-Items
- Response: `id` (PayPal-Order-ID) + `links[approve].href` (User-Redirect-URL)
- Approve-Callback: `POST /v2/checkout/orders/{id}/capture`
- Webhook: `CHECKOUT.ORDER.APPROVED` + `PAYMENT.CAPTURE.COMPLETED`

**ENV-Variablen**:
```
PAYPAL_CLIENT_ID=...
PAYPAL_SECRET=...
PAYPAL_MODE=live    # oder sandbox
```

**Flow**:
1. `/api/checkout/paypal` POST → erstellt PayPal-Order, speichert ID in
   `payment_meta.paypal_order_id`, returned `links[approve].href`
2. Client redirected zu PayPal
3. PayPal redirected zu `/checkout/paypal/return?token=<paypal_order_id>`
4. Return-Page ruft `/api/checkout/paypal/capture` → setzt
   `payment_status='paid'`, `orderStatusUpdate(paid)`
5. Webhook für Async-Bestätigung (Backup)

**Aufwand**: 1–2 Tage

### 8. Crypto (NowPayments)

**Provider**: <https://nowpayments.io> — unterstützt BTC, ETH, USDT, LTC,
TRX und ~150 weitere. Sub-account-Modell, keine Custody.

**ENV**:
```
NOWPAYMENTS_API_KEY=...
NOWPAYMENTS_IPN_SECRET=...
```

**Flow**:
1. `/api/checkout/crypto` POST → `POST https://api.nowpayments.io/v1/invoice`
   mit `price_amount`, `price_currency=KZT`, `pay_currency=btc` (oder
   User-Choice via Dropdown), `order_id`, `ipn_callback_url`
2. Response: `invoice_url` → Client redirected dorthin
3. NowPayments hosted die Payment-Page, User wählt Wallet, sendet Crypto
4. NowPayments POSTet zu `/api/checkout/crypto/ipn` mit signed payload →
   wir setzen `payment_status='paid'` bei `payment_status='finished'`

**Aufwand**: 1 Tag

### 9. Vor-Ort + Anzahlung

**Konzept**: Customer reserviert via Online-Anzahlung (z.B. 30% via
Stripe), bezahlt Rest bei Abholung. Für hochpreisige Items (vermeidet
„No-Show"-Risiko für die Galerie).

**Anzahlungs-Prozent** kommt aus Marketing-String
`payment.anzahlung.prozent_default` (Admin editierbar, Default 30%).

**Flow**:
1. `/api/checkout/anzahlung` POST → berechnet anzahlung_cents,
   erstellt Stripe-PaymentIntent über NUR diese Summe (nicht total),
   setzt `payment_method='vor_ort_anzahlung'`, `anzahlung_cents`,
   `payment_status='pending'`
2. Client öffnet Stripe-PaymentElement (Custom-UI, nicht Hosted Checkout)
3. Stripe-Confirm-Success → Webhook setzt
   `payment_status='partial'` + `anzahlung_bezahlt_am=now()`
   Order bleibt `status='pending'` (nicht fulfilled), reserve_bis 7 Tage
4. Customer holt ab + bezahlt Rest → Admin: Button „Restzahlung erhalten"
   → `payment_status='paid'` + `orderStatusUpdate(paid)` → notifyOrderPaid
   → fulfillment möglich

**Stripe-Vorteil**: payment_intent unterstützt partial-capture nicht,
aber wir erstellen einfach 2 PaymentIntents (1× Anzahlung jetzt, 1× Rest
manuell beim Pickup falls Customer auch Rest per Karte zahlen will).

**Aufwand**: 1 Tag

## Iteration 3 (optional)

- **Stripe-Apple-Pay/Google-Pay** explizit (geht im aktuellen Stripe-Checkout
  schon, aber UI könnte einen extra Schnell-Button am Anfang der Picker-
  Liste haben).
- **SEPA-Lastschrift mit Mandat** für DE/EU-Kunden.
- **Klarna / Sofort** über Stripe.
- **Recurring** für Sammler-Abo (z.B. „Neues Stück pro Monat zugeschickt").
