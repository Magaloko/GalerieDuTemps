# Galerie du Temps — Funktionsbeschreibung & Roadmap

E-Commerce- und CRM-Plattform für **galeriedutemps.kz**. Bedient **B2C** (Endkund:innen), **B2B** (Wiederverkäufer:innen mit Großhandelspreisen), **Schauraum-/Showroom-Termine**, **Workshops/Seminare**, ein **CRM**, **Newsletter**, **AI-Beratung**, **Affiliate-Programm** und einen **Messe-Modus**. Märkte: DACH. Sprachen geplant: DE/EN/RU.

> **Status-Legende**
> ✅ Live · 🚧 In Arbeit · 📅 Geplant · 💡 Stub vorbereitet

---

## 1. Öffentlicher Shop (B2C) — ✅ Basis live, 🚧 echter Checkout

| Funktion | Route | Status |
|---|---|---|
| Startseite (Hero + Featured) | `/` | ✅ |
| Produktkatalog mit Filter | `/katalog` | ✅ |
| Produktdetail mit Bilder-Galerie | `/katalog/[slug]` | ✅ |
| Kategorien | `/kategorien/[slug]` | ✅ |
| Über uns, Kontakt | `/about`, `/kontakt` | ✅ |
| Wunschliste | `/wunschliste` | ✅ |
| **Warenkorb (echt)** | `/warenkorb` | 🚧 Phase 10a |
| **Checkout (Stripe)** | `/checkout`, `/checkout/erfolg/[id]` | 🚧 Phase 10a |
| **Sichtbarkeits-Logik `b2c_mode`** (visible/teaser/hidden) | DB | 📅 Phase 10c |

---

## 2. B2B (Wiederverkäufer:innen) — 📅 Phase 10c

- Registrierung als Geschäftskund:in mit Firmenname + USt-IdNr.
- Customer-Type-Flow: `b2c` → `b2b_pending` → `b2b_verified`
- B2B-Preise serverseitig (View `products_for_caller`)
- Rabattstaffel/Mengenrabatt
- Reverse-Charge: B2B mit gültiger UID + Lieferland ≠ AT → 0% USt

---

## 3. Termine / Showroom-Buchungen — 📅 Phase 10f

- Buchungsfluss `/buchen`, `/buchen/[slug]`
- Anzahlung via Stripe
- Stornierung, Availability-Overrides, Locks
- Follow-up-Mails (Aftercare 48h, Review 7d) per Cron

---

## 4. Workshops / Seminare — 📅 Phase 10g

- Öffentliche Anmeldung über Produkte der Kategorie `seminare`
- Steuerbefreit nach § 6 Abs. 1 Z 11 lit. a UStG (Bildungsleistung, 0%)
- Schulungs-Sets bleiben bei 20% (Warenanteil dominiert)
- Admin: Seminare, Sessions, Schulungskalender, Zertifikate

---

## 5. Authentifizierung — ✅ Admin/Affiliate, 🚧 Customer

- ✅ Admin-Login (`/login`)
- ✅ Affiliate-Login (`/affiliate/anmelden`)
- 🚧 Customer-Signup (Phase 10a): Privat + Geschäft, Self-Signup, Magic-Link
- ✅ NextAuth v5 + bcrypt
- 📅 Passwort vergessen/reset für Customer
- 📅 Cleanup-Cron für unbestätigte Nutzer

---

## 6. Customer-Dashboard — 🚧 Phase 10b

| Bereich | Route |
|---|---|
| Übersicht | `/kunde` |
| Bestellungen + Detail | `/kunde/bestellungen`, `/kunde/bestellungen/[id]` |
| Termine | `/kunde/termine` |
| Affiliate | `/kunde/affiliate` |
| B2B-Status | `/kunde/b2b` |
| Profil | `/kunde/profil` |

---

## 7. Admin-Dashboard — ✅ Basis, 🚧 Erweiterungen

### Commerce (✅ teils, 🚧 erweitern)
- ✅ Produkte CRUD + Bilder-Galerie + Bulk-Margin
- ✅ Kategorien-Verwaltung
- 🚧 Coupons-Verwaltung (Phase 10a)
- 🚧 Rabattstaffel `/admin/rabattstaffel` (Phase 10c)
- 🚧 Homepage-Slides, Reel-Editor (Phase 10i)
- 🚧 Bestellungen `/admin/bestellungen` mit Detail + Statuswechsel (Phase 10a)
- 🚧 Manuelle Order-Anlage + Stripe-Payment-Link (Phase 10a)
- 🚧 Rechnungen `/admin/rechnungen` mit PDF + EPC-QR (Phase 10e)
- 🚧 Abhol-Kasse `/admin/abhol-kasse` (Phase 10e)

### Kund:innen & B2B (📅 Phase 10c)
- Kundenverwaltung mit Pipeline, Tags, Rollen
- B2B-Review (Approve/Reject mit Coupon + Mail)
- ✅ Affiliates verwalten

### Inhalte & Marketing (📅 Phase 10i)
- Journal/Blog-Editor
- Newsletter-Editor mit Custom-Blöcken (Lexical)
- Dateien-Manager
- Behandlungen/Workshops, Nachsorge-Texte

### Betrieb (✅ teils)
- ✅ Statistik-Dashboard (Recharts)
- 🚧 Crons & Event-Trigger `/admin/crons` (Phase 10k)
- 📅 Messe-Events `/admin/messe-events` (Phase 10l)

---

## 8. CRM — 📅 Phase 10h

- Pipeline `/admin/crm/pipeline` (Lead-/Kunden-Stages)
- Segmente `/admin/crm/segments` (Filter + Vorschau + E-Mail-Versand)
- Drip-Flows `/admin/crm/flows` (Welcome, Win-Back)
- Tags, Notizen, Tasks, Team-Verwaltung
- Customer-Profile mit Notizen (DSGVO-sensibel, mit Einwilligung)
- Event-Tracking `/api/crm/track`
- 1-Klick-Abmelde (`dnc_token`)

---

## 9. Mitarbeiter-App / PWA `/app` — 📅 Phase 10j

Mobile „Business Suite"-artige Oberfläche:
- Lead-Management: Inbox, Pipeline, Kunden
- Tagesgeschäft: Aufgaben, Termine, Bestellungen
- Auswertung: Statistik, Rechnungen, Einstellungen
- Marketing: Benachrichtigungen, Aktionen, Bewertungen
- Globale Suche; eigene API `/api/app/*`

---

## 10. AI-Beratung (Chat) — ✅ Live, 🚧 Audience-Cache

- ✅ `/api/ai/chat` (DeepSeek)
- ✅ 5 Tool-Calls: suche_produkte, produkt_details, preisvergleich, empfehlungen, kategorien_liste
- 🚧 Audience-Cache: getrennt für `b2c` / `b2b`; Teaser-Produkte mit Hinweis (Phase 10c)
- 📅 Admin-Chat `/api/admin/chat`

---

## 11. Affiliate-Programm — ✅ Vollständig

- ✅ Multi-Level (3 Ebenen konfigurierbar)
- ✅ Ref-Tracking via Cookie + DSGVO-Consent
- ✅ Provisionen + Auszahlungen
- ✅ SEPA-XML-Export
- 💡 Stripe-Connect (Stub, SDK-Install + ENV pending)

---

## 12. Messe-Modus — 📅 Phase 10l

- Ein QR-Code pro Event → `/messe/event/[eventId]` → Cookie + Redirect `/katalog`
- Besucher sehen gesamtes Sortiment mit B2B-Preisen + Checkout
- Sticky-Banner mit Event-Name
- Über Service-Role-Layer (kein RLS-Setting → Pool-Leak-sicher)

---

## 13. Newsletter — 📅 Phase 10i

- Anmeldung `/api/newsletter/subscribe` → Double-Opt-In `/newsletter/bestaetigt`
- Abmeldung mit Token
- Welcome-Coupon-Mail bei Bestätigung
- Lexical-Editor mit Custom-Blöcken (Hero, 2-Spalten, Button, Highlight, Produkt-Card)
- Subscriber-Verwaltung im Admin

---

## 14. Steuer & Rechnungen — 📅 Phase 10d (Steuer) + 10e (Rechnung)

- Single-Source `lib/vat.ts::getItemTaxRate(taxExempt, country, reverseCharge)`
- Regeln: `tax_exempt` → 0% · Reverse-Charge → 0% · sonst Landessatz (AT 20% / DE 19%)
- Pro-Position-Steuer (`order_items.tax_rate` + `tax_cents`) für Mixed Carts
- Rechnungs-PDF (`@react-pdf/renderer`) mit EPC-QR-Code
- § 6 UStG-Pflichtklausel bei Bildungsleistung

---

## 15. Automatisierte Jobs (Cron + Events) — 🚧 erweitern

| Endpoint | Frequenz | Zweck | Status |
|---|---|---|---|
| `affiliate-confirm` | täglich 02:00 | offen → bestaetigt | ✅ |
| `affiliate-cleanup` | wöchentlich | Alte Klicks | ✅ |
| `backup-db` | täglich 03:00 | pg_dump + Rotation | ✅ |
| `cancel-stale-pending` | 30 min | Abgebrochene Checkouts canceln + restock | 📅 10a |
| `cleanup-unconfirmed-users` | 5 min | Stuck Auth-User löschen | 📅 10b |
| `drip-flows` | 30 min | Welcome-/Winback-Drips | 📅 10h |
| `booking-followups` | täglich 10:00 | Aftercare + Review-Mails | 📅 10f |
| `birthday-coupons` | täglich 09:00 | Geburtstag-Gutscheine | 📅 10i |
| `stock-alert` | täglich 08:00 | Low-Stock-Mail | 📅 10a |
| `indexnow-sweep` | täglich 04:00 | Sitemap an IndexNow | 📅 10k |

---

## 16. Benachrichtigungen & SEO — ✅ Basis, 🚧 erweitern

- ✅ Sitemap, Robots, Metadata, OG/Twitter Cards
- 📅 Web Push (VAPID) für Admin (Phase 10k)
- 📅 JSON-LD, `llms.txt`, IndexNow (Phase 10k)
- 📅 Google-Merchant-Feed `/api/feeds/google-merchant.xml` (Phase 10k)
- ✅ Cookie-Consent → GA4/Analytics nur bei Statistik-Consent

---

## 17. Rechtliches — ✅

- ✅ `/impressum`, `/datenschutz`, `/affiliate/agb`
- 📅 `/agb` (allgemein), `/widerrufsrecht` (Phase 10a)
- ✅ DSGVO-konform, EU-Hosting (Hostinger Frankfurt)
- ✅ Drittland nur: Brevo, DeepSeek (mit Consent), optional Stripe

---

## Phasen-Roadmap

| Phase | Inhalt | Aufwand | Status |
|---|---|---|---|
| **10a** | E-Commerce-Fundament: Customer-Schema, Cart, Stripe-Checkout, Orders | 2-3 Tage | 🚧 |
| **10b** | Customer-Dashboard + Auth-Flow | 1-2 Tage | 📅 |
| **10c** | B2B-System (Registrierung, Verification, b2c_mode tri-state, B2B-Preise, Rabattstaffel) | 2 Tage | 📅 |
| **10d** | Tax/VAT-System (per-item, mixed carts, reverse-charge) | 1 Tag | 📅 |
| **10e** | Rechnungen (PDF + EPC-QR, Abhol-Kasse) | 1-2 Tage | 📅 |
| **10f** | Bookings/Termine (Buchungsfluss, Locks, Follow-ups) | 2 Tage | 📅 |
| **10g** | Workshops/Seminare (steuerbefreit, Zertifikate) | 1-2 Tage | 📅 |
| **10h** | CRM Core (Pipeline, Segmente, Drip-Flows, Tags, Tasks) | 3 Tage | 📅 |
| **10i** | Newsletter + Content (Lexical-Editor, Double-Opt-In, Journal) | 2 Tage | 📅 |
| **10j** | Mitarbeiter-PWA `/app` | 2-3 Tage | 📅 |
| **10k** | Crons, Web Push, IndexNow, Merchant-Feed | 1-2 Tage | 📅 |
| **10l** | Messe-Modus | 1 Tag | 📅 |
| **10m** | Multi-Language (DE/EN/RU via next-intl) | 2 Tage | 📅 |

**Realistische Gesamt-Bauzeit:** 6-8 Wochen Vollzeit

---

## Architektur-Prinzipien (durchgängig)

1. **Server-side first**: Preise/Rabatte/Steuern nie im Frontend rechnen — alles aus DB-Views
2. **RLS auf DB-Ebene**: Sichtbarkeit/Berechtigungen in PostgreSQL, nicht in JS
3. **Idempotente Server Actions**: Doppel-Submits führen nicht zu Doppel-Effekten
4. **Audit-Trail**: Wichtige Aktionen (Verkauf, Auszahlung, B2B-Approval) loggen Admin-ID
5. **DSGVO-by-Default**: Tracking-Cookies nur mit Consent, sensible Daten verschlüsselt (IBAN pgcrypto)
6. **Type-Safe end-to-end**: Zod-Schemas, NextAuth-Augmentation, typisierte DB-Queries
7. **Vintage-Design konsistent**: Tailwind 4 @theme-Tokens, alle Komponenten wiederverwendbar
