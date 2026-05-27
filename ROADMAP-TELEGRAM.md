# Roadmap · Telegram-Integration

Status: **alle Kern-Phasen implementiert** — Setup-Aktionen für Produktion am Ende.

| # | Ziel | Status |
|---|------|--------|
| 0 | Brand-Bot empfängt Nachrichten als Leads | ✅ live (existierend) |
| 1 | **Customer-Telegram-Notifications** (Verknüpfung + Order-Pushes) | ✅ implementiert |
| 2 | **Telegram Mini App als Shop** (Katalog + Cart + Checkout) | ✅ implementiert |
| 3 | Bot-Commands `/orders` `/status` `/wishlist` `/help` | ✅ implementiert |

## Produktiv-Schritte (nicht-Code)

Damit das alles in Produktion funktioniert:

1. **Migrations ausführen** in Coolify-Terminal:
   ```bash
   npm run db:migrate
   ```
   Wendet `sql/025_marketing_strings.sql` + `sql/026_customer_telegram.sql` an.

2. **Bot bei BotFather einrichten** (falls noch nicht passiert):
   - Telegram → @BotFather → /newbot → Token bekommen
   - In `/admin/einstellungen/telegram` Token einfügen → verifiziert + setzt Webhook

3. **Mini-App-Menübutton** beim BotFather:
   - `/mybots` → Bot wählen → Bot Settings → Menu Button
   - URL: `https://galerie.apps.dadakaev.tech/tg` (oder eigene Domain)

4. **Telegram-Payments aktivieren** (für Checkout aus Mini-App):
   - `/mybots` → Bot → Payments → Provider wählen
     - **Stripe**: global, akzeptiert Visa/MC/Apple-Pay/Google-Pay
     - **CloudPayments**: für KZ-/RU-Markt empfohlen
     - **KASPI**: prüfen ob direkte Telegram-Integration verfügbar
   - Provider gibt einen Token (Format: `123456:LIVE:...` oder `123456:TEST:...`)
   - In Coolify als ENV-Variable setzen:
     ```
     TELEGRAM_PAYMENTS_PROVIDER_TOKEN=<token>
     ```

5. **App-Restart** im Coolify damit die neue ENV greift.

---

## Phase 1 · Customer-Telegram-Notifications

**Ziel:** Kunde geht in `/kunde/profil` → Button „Telegram verknüpfen" → wird zum Brand-Bot weitergeleitet → ab dann bekommt er System-Notifications (Bestellung bestätigt, versandt, etc.) per DM statt nur E-Mail.

### Architektur

```
Customer in DB:
  + telegram_chat_id  BIGINT NULL    (Telegram-User-ID, gesetzt nach Verknüpfung)
  + telegram_link_token TEXT NULL    (One-Time-Token für /start <token>)
  + telegram_verknüpft_am TIMESTAMPTZ

Telegram-Webhook-Handler erweitern:
  Eingehende Message "/start <token>" → finde Customer mit telegram_link_token = <token>
  → setze telegram_chat_id, lösche Token, sende Bestätigung
  → ab jetzt sendMessage(chat_id, ...) für alle Bestell-Events

Notifications-Trigger:
  src/lib/notifications/customer-telegram.ts mit:
    notifyOrderPlaced(customerId, orderId)
    notifyOrderPaid(customerId, orderId)
    notifyOrderShipped(customerId, orderId, trackingUrl)
    notifyPriceDrop(customerId, productId, newPrice)    ← Wishlist-Trigger
```

### Konkrete Schritte (chronologisch)

1. **Migration** `sql/026_customer_telegram.sql`:
   - 3 Spalten zu `sebo.customers` hinzufügen
   - Index auf `telegram_chat_id` (für Reverse-Lookup)

2. **Customer-Profile-Page** `/kunde/profil` erweitern:
   - Sektion „Telegram verknüpfen"
   - Button generiert OTP-Token, baut `tg://resolve?domain=<botname>&start=<token>` Link
   - Zeigt Status: Verknüpft mit @username · entfernen-Button

3. **Webhook-Handler** in `src/app/api/telegram/webhook/[secret]/route.ts` erweitern:
   - Parse `/start <token>` Commands
   - Customer-Link-Logik
   - Eingehende Nachrichten von verknüpften Customers: NICHT als Lead anlegen (siehe Phase 3 wenn interaktiv gewünscht)

4. **Notifications-Lib** neu:
   - `src/lib/notifications/customer-telegram.ts`
   - Template-System für Bestell-Updates (mehrsprachig — nutzt das gleiche `messages/*.ts`)

5. **Hooks in Order-Lifecycle**:
   - Order erstellt → `notifyOrderPlaced`
   - Stripe-Webhook „paid" → `notifyOrderPaid`
   - Admin markiert „versandt" → `notifyOrderShipped` mit optionaler Tracking-URL

6. **Settings** in `/kunde/profil`:
   - Toggle pro Notification-Typ (Bestell-Updates / Newsletter / Price-Drop)

### Tech-Risiken

- Telegram-Bot kann nur Kunden anschreiben die den Bot **aktiv gestartet** haben (Telegram-Restriktion). Daher Link-Flow zwingend, nicht „Telefonnummer eingeben → wir schreiben dich an".
- Bei `/start <token>` aus Browser auf Mobile öffnet sich Telegram-App. Auf Desktop ohne Telegram-Client gibt's Telegram-Web-Fallback — Token-Flow funktioniert dort auch.

---

## Phase 2 · Telegram Mini App als Shop

**Ziel:** Im Telegram-Bot-Chat klickt der User auf einen Button → vollwertige Web-App öffnet sich im Telegram-eigenen Browser. Dort kann er den Katalog browsen, Wishlist verwalten, in den Warenkorb legen, mit Telegram-Login bezahlen.

### Architektur

```
Neue Route-Group  src/app/(telegram)/
  layout.tsx       — minimal, kein SiteHeader/Footer, nur Mini-App-Chrome
  page.tsx         — Katalog (gleicher Inhalt wie /katalog, aber Mini-App-styling)
  produkt/[slug]/  — Produkt-Detail
  warenkorb/       — Cart
  checkout/        — Telegram Payments + Webhook für invoice.paid

Telegram-Auth:
  Telegram WebApp.initData → enthält user.id signiert mit Bot-Token
  Server-Side: verifizieren via HMAC-SHA256, dann auto-login als Customer

Telegram Payments:
  - Stripe-Provider in BotFather aktivieren
  - sendInvoice mit prices[], currency=KZT
  - successful_payment webhook → Bestellung anlegen, Status setzen
```

### Konkrete Schritte

1. **Telegram Mini App Setup**
   - Im BotFather: `/setmenubutton` → Web-App-URL auf `https://galerie.apps.dadakaev.tech/tg`
   - `/setdomain` für Auth-Flow

2. **Route-Group** `src/app/(telegram)/`
   - layout.tsx ohne SiteHeader/Footer (Telegram bringt eigene Chrome)
   - Telegram-WebApp-Script via `<script src="https://telegram.org/js/telegram-web-app.js" />`
   - Theme syncen mit Telegram-Theme-Variables (kann hell oder dunkel sein)

3. **Auth-Endpoint** `src/app/api/telegram/auth/route.ts`:
   - Empfängt `initData` vom Frontend
   - Verifiziert HMAC mit Bot-Token
   - Findet oder erstellt Customer (`telegram_chat_id` als Eindeutigkeits-Key)
   - Setzt NextAuth-Session-Cookie

4. **Katalog/Produkt-Pages** unter `(telegram)/`
   - Reuse die Komponenten aus `/katalog` aber Mini-App-Layout (kein Header)
   - Native Telegram-Buttons via `WebApp.MainButton.setText(...).show()` statt eigene CTAs

5. **Checkout via Telegram Payments**
   - Cart → `WebApp.sendData(JSON.stringify({type:"checkout", items:[...]}))`
   - Bot-Backend empfängt sendData-Event → `sendInvoice(chat_id, prices, currency:"KZT")`
   - Telegram zeigt native Payment-UI
   - `pre_checkout_query` → verify & approve
   - `successful_payment` → Bestellung in DB anlegen, Stripe-Backend wie normal

### Tech-Risiken

- Telegram Payments unterstützt **nur bestimmte Provider** per Land. Für Kasachstan: Stripe + KASPI-Integration prüfen. Falls KASPI-Bezahlung nicht via Telegram Payments geht → externer Stripe-Checkout-Link als Fallback.
- Mini-App-Performance: Telegram-WebView ist nicht so schnell wie Chrome/Safari. Bundle-Size beachten.
- iOS-Telegram-WebView hat eigene Quirks bei Cookies — Session-Persistence testen.

---

## Phase 3 (optional) · Bot-Commands für Customer

Wenn Phase 1 läuft, kann man Bot-Commands aktivieren:

```
/wishlist  → zeigt 5 letzte Wishlist-Items mit Bildern
/orders    → zeigt offene Bestellungen
/status #1234 → Detail einer Bestellung
/help
```

Aufwand ~1 Woche. State-Machine simpel weil read-only Commands.

---

## Reihenfolge-Empfehlung

1. **Diese Session abgeschlossen** ✅: Marketing-Strings-CMS
2. **Nächste Session**: Phase 1 (Customer-Notifications) — kleiner Schritt, viel Mehrwert
3. **Nach Validierung**: Phase 2 (Mini-App) — großer Brocken, aber transformativ
4. **Optional**: Phase 3 (Commands)

Zwischen Phase 1 und 2 sollte die DB stabil sein und es sollten echte Customers mit verknüpftem Telegram existieren — sonst ist Phase 2 ungetestet.

---

## Environment-Variablen die Phase 1/2 brauchen

```bash
# Brand-Bot (existiert schon — siehe /admin/einstellungen/telegram)
# Token + Username in DB-Tabelle sebo.kanal_konten gespeichert.

# Phase 2: Mini-App URL für BotFather
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=GalerieDuTempsBot

# Phase 2: Telegram Payments
TELEGRAM_PAYMENTS_PROVIDER_TOKEN=...   # aus BotFather /mybots → Payments
```
