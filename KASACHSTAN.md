# Galerie du Temps — Kasachstan-Lokalisierung

> Komplette Anpassung der Plattform für den kasachischen Markt.
> Default-Land **KZ**, Default-Sprache **RU**, Default-Währung **KZT (₸)**.

---

## Übersicht der Anpassungen

| Bereich | Vorher (DE/EU) | Nachher (KZ) |
|---|---|---|
| **Sprachen** | DE | **RU (Default) + KZ + EN** |
| **Währung** | EUR (€) | **KZT (₸)** |
| **Steuer (VAT)** | 19% (DE) / 20% (AT) | **12% (KZ НДС)** |
| **Steuer-ID** | USt-IdNr. | **ИИН** (Person) / **БИН** (Firma) |
| **Adresse** | Straße/PLZ/Ort/Land | **Область / Город / Улица / Индекс (6-stellig)** |
| **Telefon** | +49 / +43 | **+7 7XX XXX XX XX** |
| **Zeitzone** | Europe/Berlin | **Asia/Almaty (UTC+5)** |
| **Bank-Konto** | IBAN/BIC | **ИИК / БИК** |
| **Zahlung** | Stripe (Karte/SEPA/PayPal) | **Kaspi.kz Pay + Stripe (international)** |
| **Versand** | DHL / Hermes | **Kazpost / СДЭК / Pony Express** |
| **Reverse-Charge** | EU-USt-Regelung | **Nicht anwendbar** (KZ-spezifisches System) |
| **Datenschutz** | DSGVO | **Закон о персональных данных РК** |
| **Bildungsleistung** | § 6 UStG | **Подпункт ст. 394 НК РК** |
| **Marketing-Kanäle** | E-Mail (Brevo) | **E-Mail + WhatsApp + Telegram (sehr dominant)** |

---

## Roadmap (Phase 11 — Localization)

### Phase 11a — Foundation & Settings ✦ START
- System-Settings: `country=KZ`, `default_language=ru`, `default_currency=KZT`, `timezone=Asia/Almaty`
- Multi-Currency-Layer in `formatPreis()` (₸ als Default, mit Thousands-Separator)
- Adress-Schema flexibler: JSONB mit Land-spezifischen Feldern
- Steuer-Logik erweitern: KZ 12% + KZ-Reverse-Charge-Verhalten
- DB-Migration für ИИН/БИН/ИИК/БИК-Felder

### Phase 11b — i18n Foundation
- `next-intl` installieren (oder eigene Lösung)
- Locale-Routing: `/ru/*`, `/kz/*`, `/en/*`
- Auto-Detect via `Accept-Language` + Cookie-Override
- Sprach-Switcher im Header
- Übersetzungs-Dictionaries für alle Customer-Facing-Strings

### Phase 11c — Inhalts-Übersetzungen
- Alle Public-Pages auf RU + KZ + EN
- E-Mail-Templates auf RU (primär), KZ + EN als Variante
- DeepSeek-System-Prompt auf RU
- AGB / Datenschutz / Impressum — KZ-Recht-konform
- Newsletter-Renderer multi-language

### Phase 11d — Kaspi.kz Integration
- Kaspi-Pay-Service (lib/payment/kaspi.ts) mit:
  - Kaspi QR-Code für Sofort-Zahlung
  - Kaspi-Pay-Link für Online-Checkout
  - Webhook-Handler
- Checkout-Page mit Kaspi vs. Stripe Auswahl
- Status-Tracking parallel zum Stripe-Webhook
- Admin-Settings für Kaspi-API-Keys

### Phase 11e — Versand & Adressen
- Adress-Eingabe-Komponente mit Oblast-Dropdown (14 Oblasts + 3 Cities)
- 6-stellige Index-Validierung
- Telefon-Maske +7 7XX XXX XX XX
- Versandkosten-Berechnung pro Oblast (Kazpost-Tarife)

### Phase 11f — Marketing-Kanäle
- WhatsApp-Click-to-Chat-Buttons (sehr wichtig in KZ!)
- Telegram-Channel-Verknüpfung
- Floating "Связаться в WhatsApp"-Button (statt nur E-Mail)
- Footer mit Social Media (Instagram, TikTok)

---

## Rechtliches (Kasachstan)

### Datenschutz: Закон РК «О персональных данных и их защите»
- **Lokalisierungspflicht**: KZ-Bürger-Daten müssen auf Servern in Kasachstan liegen
  → Hostinger Frankfurt funktioniert NICHT für 100% Compliance
  → **Empfehlung**: Hosting in KZ (z.B. KazRENA Cloud) oder Sub-Datacenter
- Cookie-Banner trotzdem als Best Practice
- AVV-äquivalente Verträge mit allen Auftragsverarbeitern

### Steuer (НК РК)
- **VAT (НДС)**: Standardsatz **12 %**
- **Schwelle für VAT-Pflicht**: 20.000 МРП (ca. ~70 Mio. KZT Umsatz/Jahr)
- **Bildungsleistungen**: steuerbefreit (ст. 394 НК РК)
- **Kleinunternehmer-Modus**: спецналоговый режим — auch hier andere Regeln als DE

### Verbraucherschutz: Закон РК «О защите прав потребителей»
- 14 Tage Widerruf (wie EU)
- Garantie min. 12 Monate
- Pflichtangaben: Hersteller, Herkunftsland, Zusammensetzung

### Affiliate-Provisionen
- ИПН (Steuer auf persönliches Einkommen) **10 %** auf Provisionen
- Affiliate muss als ИП (Individual-Unternehmer) oder TOO registriert sein
- Auszahlung auf KZ-Konto erfordert ИИК

---

## Bank-Daten (KZ)

| Feld | Beispiel | Format |
|---|---|---|
| **ИИК** (Bank-Konto) | KZ12345678901234567890 | 20 Stellen, beginnt mit "KZ" |
| **БИК** (Bank-Code) | HSBKKZKX | 8 Stellen, Bank-Identifier |
| **ИИН** (Steuer-ID Person) | 123456789012 | 12 Stellen |
| **БИН** (Steuer-ID Firma) | 123456789012 | 12 Stellen |
| **КБе** (Begünstigten-Code) | 19 | 2 Stellen (19 = juristische Person) |

---

## Oblasts (Verwaltungsregionen)

14 Oblasts + 3 City-of-Republic-Significance:
- Almaty (город) · Astana (город) · Shymkent (город)
- Almaty Oblast · Akmola · Aktobe · Atyrau · Ost-Kasachstan · West-Kasachstan · Karaganda · Kostanay · Kyzylorda · Mangystau · Pavlodar · Nord-Kasachstan · Turkestan · Jambyl · Abai · Ulytau · Schetysu

---

## Mobile-First-Markt

KZ-Markt ist stark mobil:
- **80%+ Smartphone-Nutzung**
- WhatsApp + Telegram als Hauptkommunikation
- Instagram + TikTok als Marketing-Kanäle
- Kaspi.kz App ist täglich auf jedem Handy

→ UI MUSS mobile-first sein, Touch-optimiert, große CTAs

---

## Was bleibt gleich
- Komplette CRM-Logik (10h)
- Affiliate-MLM-System (Phase 9)
- KI-Assistent (Phase 5)  — nur System-Prompt auf RU
- Order-Workflow, Pipeline, Tags, Notes, Tasks
- Block-basierter Newsletter-Editor (10i)
- Block-basierter Editor-Logik (Frontend, Inhalte nur übersetzt)

---

**Start:** Phase 11a-d in dieser Reihenfolge.
**Realistische Bauzeit:** 4-6 Wochen Vollzeit.
