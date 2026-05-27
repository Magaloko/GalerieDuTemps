-- ═══════════════════════════════════════════════════════════════════════════
-- _APPLY_PENDING_MIGRATIONS.sql
-- Generiert am 2026-05-27T07:05:23Z — kombiniert die 3 ausstehenden Migrationen:
--   023_marketing_strings.sql
--   024_customer_telegram.sql
--   025_payment_methods.sql
-- Plus Tracking-Inserts in sebo.schema_migrations damit npm run db:migrate
-- später nicht doppelt läuft.
--
-- Anwendung 1 (empfohlen): Supabase Dashboard → SQL Editor → paste → Run
-- Anwendung 2:             psql $DATABASE_URL -f sql/_APPLY_PENDING_MIGRATIONS.sql
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- Bootstrap (idempotent, legt schema_migrations an wenn nicht da)
-- =============================================================================
-- galeriedutemps · Migration-Tracking
-- Wird IMMER zuerst ausgeführt (Präfix 000).
-- npm run db:migrate liest sql/*.sql in alphabetischer Reihenfolge,
-- vergleicht mit dieser Tabelle und führt nur neue Files aus.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS sebo;

CREATE TABLE IF NOT EXISTS sebo.schema_migrations (
    filename       VARCHAR(200) PRIMARY KEY,
    sha256         CHAR(64)     NOT NULL,                 -- Dateiinhalt-Hash → erkennt Änderungen
    executed_am    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    executed_von   VARCHAR(100) NOT NULL DEFAULT current_user,
    dauer_ms       INTEGER
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_zeit
    ON sebo.schema_migrations(executed_am DESC);

COMMENT ON TABLE sebo.schema_migrations IS
    'Tracking aller ausgeführten SQL-Migrationen. Niemals manuell DELETEn — Migrations sind idempotent.';

-- ── 023 ───────────────────────────────────────────────────────────────────
-- ────────────────────────────────────────────────────────────────────────────
-- 023_marketing_strings.sql — Editierbare Marketing-Texte (Hero, Ticker, etc.)
--
-- Bisher waren Slogans, CTA-Labels und Promo-Texte im Code hardcoded — nur
-- per Re-Deploy änderbar. Diese Tabelle bringt sie in die Admin-Oberfläche.
--
-- Designentscheidung: KV-Store mit JSONB für i18n.
--   schluessel — slug-style Key (z.B. 'home.hero.h1_unten')
--   wert_i18n  — { ru: "...", en: "...", de: "..." }  (Sprachen optional)
--   beschreibung — Hinweis für Admin wo dieser String erscheint
--   fallback   — Wert wenn weder DB noch Sprache vorhanden ist (für Migration)
--
-- Lese-Helper in src/lib/db/marketing-strings.ts hat 60s-Cache.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sebo.marketing_strings (
  schluessel       TEXT PRIMARY KEY,
  wert_i18n        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  beschreibung     TEXT,
  fallback         TEXT        NOT NULL DEFAULT '',
  aktualisiert_am  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-Update von aktualisiert_am bei jedem UPDATE
CREATE OR REPLACE FUNCTION sebo.marketing_strings_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.aktualisiert_am := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketing_strings_touch ON sebo.marketing_strings;
CREATE TRIGGER trg_marketing_strings_touch
  BEFORE UPDATE ON sebo.marketing_strings
  FOR EACH ROW EXECUTE FUNCTION sebo.marketing_strings_touch();

-- ── Seed: die wichtigsten editierbaren Strings ─────────────────────────────
INSERT INTO sebo.marketing_strings (schluessel, wert_i18n, beschreibung, fallback) VALUES

-- Hero (Startseite, A1 Editorial)
('home.hero.eyebrow',
 '{"ru":"Rare pieces with history, elegance, and timeless charm.","en":"Rare pieces with history, elegance, and timeless charm.","de":"Rare pieces with history, elegance, and timeless charm."}'::jsonb,
 'Startseite → Hero → Eyebrow oben links',
 'Rare pieces with history, elegance, and timeless charm.'),

('home.hero.h1_oben',
 '{"ru":"Редкие вещи","en":"Rare pieces","de":"Seltene Stücke"}'::jsonb,
 'Startseite → Hero → erste Zeile der großen Überschrift',
 'Редкие вещи'),

('home.hero.h1_unten',
 '{"ru":"с историей.","en":"with history.","de":"mit Geschichte."}'::jsonb,
 'Startseite → Hero → zweite Zeile, italic+coral',
 'с историей.'),

('home.hero.subhead',
 '{"ru":"Кураторская подборка винтажа из Алматы — мебель, керамика, графика, текстиль. Каждый предмет проходит атрибуцию и реставрацию.","en":"A curated vintage selection from Almaty — furniture, ceramics, prints, textiles. Each piece is attributed and restored.","de":"Kuratierte Vintage-Auswahl aus Almaty — Möbel, Keramik, Grafik, Textilien. Jedes Stück wird attribuiert und restauriert."}'::jsonb,
 'Startseite → Hero → Subhead unter der H1',
 'Кураторская подборка винтажа из Алматы.'),

('home.hero.cta_primary',
 '{"ru":"Открыть каталог","en":"Browse catalogue","de":"Katalog öffnen"}'::jsonb,
 'Startseite → Hero → primärer CTA-Button (Coral)',
 'Открыть каталог'),

('home.hero.cta_secondary',
 '{"ru":"Пройти квиз","en":"Take the quiz","de":"Quiz starten"}'::jsonb,
 'Startseite → Hero → sekundärer CTA-Button (ghost)',
 'Пройти квиз'),

-- Ticker (Bar zwischen Hero und Content)
('home.ticker.links',
 '{"ru":"◆ На складе · {n} предметов","en":"◆ In stock · {n} items","de":"◆ Auf Lager · {n} Stücke"}'::jsonb,
 'Startseite → Ticker-Bar links · {n} wird durch Produktanzahl ersetzt',
 '◆ На складе · 342 предметов'),

('home.ticker.mitte',
 '{"ru":"Новые поступления каждую среду","en":"New arrivals every Wednesday","de":"Neuzugänge jeden Mittwoch"}'::jsonb,
 'Startseite → Ticker-Bar Mitte',
 'Новые поступления каждую среду'),

('home.ticker.rechts',
 '{"ru":"Доставка по СНГ ↗","en":"Shipping CIS-wide ↗","de":"Versand in alle GUS-Staaten ↗"}'::jsonb,
 'Startseite → Ticker-Bar rechts',
 'Доставка по СНГ ↗'),

-- Promo-Bar im Header (D1)
('header.promo.links',
 '{"ru":"◆ Бесплатная доставка по Казахстану от ₸ 50 000","en":"◆ Free shipping within Kazakhstan from ₸ 50,000","de":"◆ Kostenloser Versand in Kasachstan ab ₸ 50.000"}'::jsonb,
 'Header → schmale Promo-Bar oben links',
 '◆ Бесплатная доставка по Казахстану от ₸ 50 000'),

('header.promo.rechts',
 '{"ru":"Новые поступления каждую среду","en":"New arrivals every Wednesday","de":"Neuzugänge jeden Mittwoch"}'::jsonb,
 'Header → Promo-Bar oben rechts (Coral)',
 'Новые поступления каждую среду'),

-- Newsletter-Band (Footer)
('footer.newsletter.h1_oben',
 '{"ru":"Подписка на","en":"Subscribe to the","de":"Abonniere das"}'::jsonb,
 'Footer → Newsletter-Band → Headline links',
 'Подписка на'),

('footer.newsletter.h1_italic',
 '{"ru":"журнал","en":"journal","de":"Journal"}'::jsonb,
 'Footer → Newsletter-Band → italic+coral Wort',
 'журнал'),

('footer.newsletter.cta',
 '{"ru":"Подписаться","en":"Subscribe","de":"Abonnieren"}'::jsonb,
 'Footer → Newsletter-Form → Submit-Button',
 'Подписаться'),

-- Story-Teaser auf Startseite
('home.story.eyebrow_override',
 '{"ru":"","en":"","de":""}'::jsonb,
 '(optional) Überschreibt t.home.story_eyebrow wenn nicht leer',
 ''),

('home.story.titel_override',
 '{"ru":"","en":"","de":""}'::jsonb,
 '(optional) Überschreibt t.home.story_titel wenn nicht leer',
 '')

ON CONFLICT (schluessel) DO NOTHING;

INSERT INTO sebo.schema_migrations (filename, sha256, dauer_ms) VALUES
  ('023_marketing_strings.sql', '9dbf56cf574570ff76a8b5b953e1e6d8bfe84b39272ea00d661c509e2ccf62e0', 0)
ON CONFLICT (filename) DO UPDATE SET sha256=EXCLUDED.sha256, executed_am=now();

-- ── 024 ───────────────────────────────────────────────────────────────────
-- ────────────────────────────────────────────────────────────────────────────
-- 024_customer_telegram.sql — Customer ↔ Telegram-Verknüpfung
--
-- Phase B1 der Telegram-Integration (siehe ROADMAP-TELEGRAM.md). Erlaubt
-- Customers ihren Telegram-Account zu verbinden um Bestell-Notifications
-- per DM statt nur per E-Mail zu bekommen.
--
-- Verknüpfungs-Flow:
--   1. Customer in /kunde/profil klickt „Telegram verknüpfen"
--   2. Server generiert OTP-Token, speichert in telegram_link_token
--   3. UI zeigt Deep-Link: tg://resolve?domain=<bot>&start=<token>
--   4. Customer öffnet Link → Telegram → /start <token> an Bot
--   5. Webhook validiert Token → setzt telegram_chat_id, löscht Token
--   6. Ab jetzt: sendMessage(chat_id, ...) für Bestell-Events
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE sebo.customers
  ADD COLUMN IF NOT EXISTS telegram_chat_id       BIGINT,
  ADD COLUMN IF NOT EXISTS telegram_username      VARCHAR(64),
  ADD COLUMN IF NOT EXISTS telegram_link_token    VARCHAR(64),
  ADD COLUMN IF NOT EXISTS telegram_verknuepft_am TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS telegram_notifications_aktiv BOOLEAN NOT NULL DEFAULT true;

-- chat_id ist global eindeutig (ein Telegram-User = ein Customer)
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_telegram_chat_id
  ON sebo.customers(telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;

-- token muss zur Verifizierungs-Lookup eindeutig sein
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_telegram_link_token
  ON sebo.customers(telegram_link_token)
  WHERE telegram_link_token IS NOT NULL;

COMMENT ON COLUMN sebo.customers.telegram_chat_id IS
  'Telegram-User-ID (chat_id für private Chats). NULL = nicht verknüpft.';
COMMENT ON COLUMN sebo.customers.telegram_link_token IS
  'OTP-Token für /start-Command. Wird beim erfolgreichen Verknüpfen gelöscht.';
COMMENT ON COLUMN sebo.customers.telegram_notifications_aktiv IS
  'Master-Toggle für Telegram-Notifications (Bestellung, Versand, etc.).';

INSERT INTO sebo.schema_migrations (filename, sha256, dauer_ms) VALUES
  ('024_customer_telegram.sql', '882e0408076b2c310e8d131e3bb14f67644664a22f8e00fe22de6f752ca1b33e', 0)
ON CONFLICT (filename) DO UPDATE SET sha256=EXCLUDED.sha256, executed_am=now();

-- ── 025 ───────────────────────────────────────────────────────────────────
-- ────────────────────────────────────────────────────────────────────────────
-- 025_payment_methods.sql — Multi-Provider-Payment + Anzahlung
--
-- Erweitert sebo.orders um payment_method + payment_status + payment_meta,
-- damit Bestellungen auch via PayPal, Crypto, Bank-Transfer oder vor-Ort
-- (mit oder ohne Anzahlung) verarbeitet werden können — nicht nur Stripe.
--
-- payment_method   — welche Methode hat der Customer gewählt
-- payment_status   — separater Status nur für Zahlung (unpaid/partial/paid/…)
--                    UNABHÄNGIG vom order.status, weil eine Bestellung
--                    'pending' Order-Status haben kann während payment_status
--                    bereits 'partial' (Anzahlung empfangen) ist.
-- payment_meta     — provider-spezifische Felder (PayPal-Order-ID,
--                    Crypto-Adresse, Bank-Reference, etc.) als JSONB.
-- anzahlung_cents  — Wenn > 0: nur dieser Betrag muss online bezahlt werden,
--                    der Rest (total - anzahlung) wird vor Ort kassiert.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE sebo.orders
  ADD COLUMN IF NOT EXISTS payment_method  VARCHAR(40),
  ADD COLUMN IF NOT EXISTS payment_status  VARCHAR(20) NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_meta    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS anzahlung_cents INTEGER,
  ADD COLUMN IF NOT EXISTS anzahlung_bezahlt_am TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(60);

-- Existing CHECK constraint (status IN …) bleibt für status-Spalte. Wir
-- fügen einen separaten Check für payment_status hinzu (idempotent via DO):
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_status_check'
  ) THEN
    ALTER TABLE sebo.orders
      ADD CONSTRAINT orders_payment_status_check
      CHECK (payment_status IN ('unpaid','pending','partial','paid','refunded','failed'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_method_check'
  ) THEN
    ALTER TABLE sebo.orders
      ADD CONSTRAINT orders_payment_method_check
      CHECK (payment_method IS NULL OR payment_method IN (
        'stripe_card',
        'stripe_sepa',
        'paypal',
        'crypto_nowpayments',
        'bank_transfer',
        'vor_ort',
        'vor_ort_anzahlung',
        'telegram_payments',
        'kaspi'
      ));
  END IF;
END $$;

-- Reverse-Lookup nach Reference (Admin sucht nach Banküberweisungs-Code)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_reference
  ON sebo.orders(payment_reference)
  WHERE payment_reference IS NOT NULL;

-- Index für offene Zahlungen (Admin-Inbox)
CREATE INDEX IF NOT EXISTS idx_orders_payment_status_open
  ON sebo.orders(payment_status)
  WHERE payment_status IN ('unpaid','pending','partial');

COMMENT ON COLUMN sebo.orders.payment_method IS
  'Vom Customer gewählte Zahlungsart. NULL = noch nicht entschieden (Order in Cart).';
COMMENT ON COLUMN sebo.orders.payment_status IS
  'Separat von status: kann ''partial'' sein während order.status noch ''pending''.';
COMMENT ON COLUMN sebo.orders.payment_meta IS
  'Provider-spezifische Daten (paypal_order_id, crypto_address, bank_reference, …).';
COMMENT ON COLUMN sebo.orders.anzahlung_cents IS
  'Wenn gesetzt: dieser Betrag online, Restbetrag bei Abholung. Total = total_cents.';

-- ────────────────────────────────────────────────────────────────────────────
-- Seed: Bank-Daten + Vor-Ort-Anweisungen als editierbare Marketing-Strings
-- (siehe sql/023_marketing_strings.sql). Auch wenn Tabelle leer — User kann
-- nach Migration die echten Werte im Admin → Marketing-Texte eintragen.
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO sebo.marketing_strings (schluessel, wert_i18n, beschreibung, fallback) VALUES

('payment.bank.kontoinhaber',
 '{"ru":"Galerie du Temps KZ","en":"Galerie du Temps KZ","de":"Galerie du Temps KZ"}'::jsonb,
 'Bank-Überweisung: Kontoinhaber-Name', 'Galerie du Temps KZ'),

('payment.bank.bank_name',
 '{"ru":"Halyk Bank Kazakhstan","en":"Halyk Bank Kazakhstan","de":"Halyk Bank Kazakhstan"}'::jsonb,
 'Bank-Überweisung: Bank-Name', 'Halyk Bank'),

('payment.bank.iban',
 '{"ru":"KZ00 0000 0000 0000 0000","en":"KZ00 0000 0000 0000 0000","de":"KZ00 0000 0000 0000 0000"}'::jsonb,
 'Bank-Überweisung: IBAN / Konto-Nummer', 'KZ00 0000 0000 0000 0000'),

('payment.bank.bic',
 '{"ru":"HSBKKZKX","en":"HSBKKZKX","de":"HSBKKZKX"}'::jsonb,
 'Bank-Überweisung: BIC / SWIFT', 'HSBKKZKX'),

('payment.bank.zusatz',
 '{"ru":"Указать в назначении платежа: {ref}","en":"Reference in transfer: {ref}","de":"Verwendungszweck: {ref}"}'::jsonb,
 'Hinweis-Text wie Reference anzugeben. {ref} wird durch Bestellungs-Reference ersetzt.',
 'Указать в назначении платежа: {ref}'),

('payment.vor_ort.adresse',
 '{"ru":"ул. Достык 89, БЦ Тенгиз · Алматы","en":"Dostyk str. 89, Tengiz BC · Almaty","de":"Dostyk str. 89, Tengiz BC · Almaty"}'::jsonb,
 'Vor-Ort-Bezahlung: Adresse der Galerie', 'Алматы'),

('payment.vor_ort.oeffnungszeiten',
 '{"ru":"Пн–Пт 10:00–18:00 · Сб 11:00–16:00","en":"Mon–Fri 10:00–18:00 · Sat 11:00–16:00","de":"Mo–Fr 10:00–18:00 · Sa 11:00–16:00"}'::jsonb,
 'Vor-Ort-Bezahlung: Öffnungszeiten', 'Mo–Fr 10:00–18:00'),

('payment.anzahlung.prozent_default',
 '{"ru":"30","en":"30","de":"30"}'::jsonb,
 'Vor-Ort + Anzahlung: Default-Prozentsatz für Online-Anzahlung (Rest bei Abholung)',
 '30')

ON CONFLICT (schluessel) DO NOTHING;

INSERT INTO sebo.schema_migrations (filename, sha256, dauer_ms) VALUES
  ('025_payment_methods.sql', '7ad73ad0f9ab7247cca2cab6c1af6508c0aa76ee2aa9998417fffe1442123dfe', 0)
ON CONFLICT (filename) DO UPDATE SET sha256=EXCLUDED.sha256, executed_am=now();

COMMIT;

-- Verifikation nach Run:
-- SELECT filename, executed_am FROM sebo.schema_migrations ORDER BY executed_am DESC LIMIT 5;
