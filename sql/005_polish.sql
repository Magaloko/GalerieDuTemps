-- =============================================================================
-- vintage-market · Phase 9f: AGB, Cookies, SEPA, Stripe
-- - Erweitert affiliates um Stripe-Connect-Felder
-- - Erweitert affiliate_einstellungen um Firma/SEPA/Stripe-Schlüssel
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Stripe-Connect Spalten in sebo.affiliates
-- ---------------------------------------------------------------------------
ALTER TABLE sebo.affiliates
    ADD COLUMN IF NOT EXISTS stripe_account_id      VARCHAR(50),
    ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN     NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN     NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS stripe_connected_am    TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_affiliates_stripe ON sebo.affiliates(stripe_account_id);

-- ---------------------------------------------------------------------------
-- 2. Globale Einstellungen erweitern (Firma, SEPA, Stripe-Flags)
-- ---------------------------------------------------------------------------
INSERT INTO sebo.affiliate_einstellungen (schluessel, wert, beschreibung) VALUES
    -- Firmen-Stammdaten (für PDFs, SEPA, E-Mails)
    ('firma_name',          'Galerie du Temps',                'Firmenname (für Belege)'),
    ('firma_strasse',       'Musterstraße 1',                'Straße + Hausnummer'),
    ('firma_plz',           '10115',                         'Postleitzahl'),
    ('firma_ort',           'Berlin',                        'Ort'),
    ('firma_land',          'DE',                            'Ländercode ISO'),
    ('firma_email',         'hallo@galeriedutemps.kz',       'Geschäfts-E-Mail'),
    ('firma_telefon',       '',                              'Telefon (optional)'),
    ('firma_steuer_id',     '',                              'Steuer-Nr.'),
    ('firma_ust_id',        '',                              'USt-IdNr. (DE...)'),
    ('firma_handelsregister','',                             'HRB / HRA Eintrag'),

    -- SEPA-Konfiguration (für XML-Export pain.001.001.03)
    ('sepa_absender_iban',  '',                              'Absender-IBAN (Firmenkonto)'),
    ('sepa_absender_bic',   '',                              'Absender-BIC'),
    ('sepa_absender_name',  'Galerie du Temps',                'Name des Auftraggebers'),
    ('sepa_creditor_id',    '',                              'SEPA Creditor-ID (DE...)'),

    -- Stripe-Connect (Status-Flags, Secrets in env)
    ('stripe_connect_enabled',     'false',                  'Stripe-Connect Auszahlungen aktiv'),
    ('stripe_publishable_key',     '',                       'Publishable Key (öffentlich, pk_...)'),
    ('stripe_mode',                'test',                   'test | live'),

    -- Cookie-Consent / DSGVO
    ('cookie_banner_aktiv',        'true',                   'Cookie-Banner anzeigen'),
    ('analytics_aktiv',            'false',                  'Analytics-Cookie-Kategorie verfügbar (Platzhalter)')
ON CONFLICT (schluessel) DO NOTHING;

-- =============================================================================
-- ENDE 005_polish.sql
-- =============================================================================
