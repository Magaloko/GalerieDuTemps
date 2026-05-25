-- =============================================================================
-- vintage-market · Phase 11 — Kasachstan-Lokalisierung
-- ИИН / БИН / ИИК / БИК, KZ als Standard-Land, KZT als Standard-Währung
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Customer-Erweiterung: ИИН (Person) / БИН (Firma)
-- ---------------------------------------------------------------------------
ALTER TABLE sebo.customers
    ADD COLUMN IF NOT EXISTS iin VARCHAR(12),                  -- 12 Stellen
    ADD COLUMN IF NOT EXISTS bin VARCHAR(12),                  -- 12 Stellen (Firma)
    ADD COLUMN IF NOT EXISTS kbe SMALLINT;                     -- 2 Stellen, z.B. 19 (jur. Person)

CREATE INDEX IF NOT EXISTS idx_customers_iin ON sebo.customers(iin) WHERE iin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_bin ON sebo.customers(bin) WHERE bin IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Affiliate-Erweiterung: KZ-Bank-Daten
-- ---------------------------------------------------------------------------
ALTER TABLE sebo.affiliates
    ADD COLUMN IF NOT EXISTS iic VARCHAR(25),                  -- ИИК (Konto, beginnt mit KZ + 18 Stellen)
    ADD COLUMN IF NOT EXISTS bik VARCHAR(11),                  -- БИК (Bank-Code, 8 Stellen)
    ADD COLUMN IF NOT EXISTS iin_affiliate VARCHAR(12),        -- Persönliche Steuer-ID
    ADD COLUMN IF NOT EXISTS bin_affiliate VARCHAR(12),        -- Firmen-Steuer-ID
    ADD COLUMN IF NOT EXISTS kbe_affiliate SMALLINT;

-- Auszahlungsmethode erweitern um 'kaspi' und 'iic' (statt sepa für KZ)
ALTER TABLE sebo.affiliates
    DROP CONSTRAINT IF EXISTS affiliates_auszahlungs_methode_check;

ALTER TABLE sebo.affiliates
    ADD CONSTRAINT affiliates_auszahlungs_methode_check
    CHECK (auszahlungs_methode IN ('sepa','paypal','kaspi','iic_transfer'));

-- Auszahlungs-Methoden in auszahlungen-Tabelle ebenfalls erweitern
ALTER TABLE sebo.auszahlungen
    DROP CONSTRAINT IF EXISTS auszahlungen_methode_check;

ALTER TABLE sebo.auszahlungen
    ADD CONSTRAINT auszahlungen_methode_check
    CHECK (methode IN ('sepa','paypal','kaspi','iic_transfer'));

-- ---------------------------------------------------------------------------
-- 3. Orders: Kaspi-Felder + ИИН/БИН-Snapshot
-- ---------------------------------------------------------------------------
ALTER TABLE sebo.orders
    ADD COLUMN IF NOT EXISTS kaspi_payment_id  VARCHAR(255),
    ADD COLUMN IF NOT EXISTS kaspi_qr_url      TEXT,
    ADD COLUMN IF NOT EXISTS payment_method    VARCHAR(20) DEFAULT 'stripe'
        CHECK (payment_method IN ('stripe','kaspi','sepa','manual')),
    ADD COLUMN IF NOT EXISTS iin_snapshot      VARCHAR(12),
    ADD COLUMN IF NOT EXISTS bin_snapshot      VARCHAR(12);

CREATE INDEX IF NOT EXISTS idx_orders_kaspi ON sebo.orders(kaspi_payment_id) WHERE kaspi_payment_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. System-Settings auf KZ-Defaults umstellen
-- ---------------------------------------------------------------------------
UPDATE sebo.affiliate_einstellungen SET wert = 'Galerie du Temps KZ' WHERE schluessel = 'firma_name' AND wert = 'Galerie du Temps';
UPDATE sebo.affiliate_einstellungen SET wert = 'KZ'        WHERE schluessel = 'firma_land' AND wert = 'DE';
UPDATE sebo.affiliate_einstellungen SET wert = 'Алматы'    WHERE schluessel = 'firma_ort' AND wert = 'Berlin';
UPDATE sebo.affiliate_einstellungen SET wert = '050000'    WHERE schluessel = 'firma_plz' AND wert = '10115';

-- Neue KZ-spezifische Settings
INSERT INTO sebo.affiliate_einstellungen (schluessel, wert, beschreibung) VALUES
    -- Land & Sprache
    ('default_country',     'KZ',         'Standard-Land für neue Kunden/Bestellungen'),
    ('default_currency',    'KZT',        'Standard-Währung (KZT, EUR, USD)'),
    ('default_language',    'ru',         'Standard-Sprache (ru/kz/en/de)'),
    ('default_timezone',    'Asia/Almaty','Standard-Zeitzone'),
    -- Steuer
    ('vat_default_percent', '12',         'Standard-USt-Satz in % (KZ: 12, DE: 19, AT: 20)'),
    ('firma_iin',           '',           'ИИН (für Einzelunternehmer)'),
    ('firma_bin',           '',           'БИН (für TOO / juristische Person)'),
    ('firma_kbe',           '19',         'КБе (19 = juristische Person)'),
    -- Bank
    ('firma_iic',           '',           'ИИК (Bankkonto)'),
    ('firma_bik',           '',           'БИК (Bank-Code)'),
    ('firma_bank_name',     '',           'Bank-Name (z.B. Halyk Bank, Kaspi)'),
    -- Kaspi
    ('kaspi_enabled',       'false',      'Kaspi.kz Pay aktiviert'),
    ('kaspi_merchant_id',   '',           'Kaspi Merchant-ID'),
    ('kaspi_terminal_id',   '',           'Kaspi Terminal-ID'),
    -- Kontakt
    ('whatsapp_nummer',     '',           'WhatsApp-Nummer (+7 7XX XXX XX XX)'),
    ('telegram_channel',    '',           'Telegram-Channel/Username (@galeriedutemps_)'),
    ('instagram_handle',    'galeriedutemps_', 'Instagram-Handle (siehe https://instagram.com/galeriedutemps_)')
ON CONFLICT (schluessel) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Affiliate-Einstellungen: Mindestauszahlung KZT-konform anheben
-- (KZT ist viel "kleiner" als EUR — Mindestbetrag ggf. anpassen)
-- 20 EUR ≈ 10.000 KZT — wir setzen 20.000 KZT als Default
-- ---------------------------------------------------------------------------
UPDATE sebo.affiliate_einstellungen
    SET wert = '20000', beschreibung = 'Mindestbetrag für Auszahlung in Cents (20.000 KZT = ₸200)'
    WHERE schluessel = 'mindestauszahlung_cent' AND wert = '2000';

-- =============================================================================
-- ENDE 009_kasachstan.sql
-- =============================================================================
