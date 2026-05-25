-- =============================================================================
-- galeriedutemps · KOMBINIERTES SUPABASE-SCHEMA
-- =============================================================================
-- Alle 10 Migrationen in einer Datei.
--
-- ANWENDUNG (Supabase Dashboard):
-- 1. https://supabase.com/dashboard/project/<PROJECT-REF>/sql/new
-- 2. Diese komplette Datei reinkopieren
-- 3. Auf 'Run' (oder Strg+Enter) klicken
--
-- Dauer: ~5-10 Sek
-- =============================================================================

-- ─── Extensions (citext + pgcrypto sind PFLICHT) ─────────────────────────
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Schema sebo (PFLICHT für alle folgenden Migrationen) ────────────────
CREATE SCHEMA IF NOT EXISTS sebo;

-- ─── Auto-update trigger function (von 001 referenziert) ─────────────────
-- Wird in 001 nochmal erstellt, hier als Sicherheit für andere Files
CREATE OR REPLACE FUNCTION sebo.update_aktualisiert_am()
RETURNS TRIGGER AS $$
BEGIN
    NEW.aktualisiert_am = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- 000_schema_migrations.sql
-- =============================================================================
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


-- =============================================================================
-- 001_sebo_schema.sql
-- =============================================================================
-- =============================================================================
-- vintage-market · sebo.* Schema
-- App-Daten: Benutzer, Kategorien, Produkte, Bilder, Wunschliste,
--            Kontaktanfragen, Preishistorie, NextAuth Sessions
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS sebo;

-- ---------------------------------------------------------------------------
-- Benutzer (Admin-Accounts)
-- ---------------------------------------------------------------------------
CREATE TABLE sebo.benutzer (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    passwort_hash   VARCHAR(255)        NOT NULL,
    name            VARCHAR(100),
    rolle           VARCHAR(20)         NOT NULL DEFAULT 'admin'
                    CHECK (rolle IN ('admin', 'superadmin')),
    aktiv           BOOLEAN             NOT NULL DEFAULT true,
    erstellt_am     TIMESTAMPTZ         NOT NULL DEFAULT now(),
    aktualisiert_am TIMESTAMPTZ         NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Kategorien  (hierarchisch, selbst-referenziell)
-- ---------------------------------------------------------------------------
CREATE TABLE sebo.kategorien (
    id            SERIAL      PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    slug          VARCHAR(120) UNIQUE NOT NULL,
    beschreibung  TEXT,
    eltern_id     INTEGER      REFERENCES sebo.kategorien(id) ON DELETE SET NULL,
    bild_url      VARCHAR(500),
    sortierung    INTEGER      NOT NULL DEFAULT 0,
    aktiv         BOOLEAN      NOT NULL DEFAULT true,
    erstellt_am   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_kategorien_slug     ON sebo.kategorien(slug);
CREATE INDEX idx_kategorien_eltern   ON sebo.kategorien(eltern_id);

-- ---------------------------------------------------------------------------
-- Produkte
-- ---------------------------------------------------------------------------
CREATE TABLE sebo.produkte (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(300) NOT NULL,
    slug             VARCHAR(350) UNIQUE NOT NULL,
    beschreibung     TEXT,
    kurzbeschreibung VARCHAR(500),
    preis            NUMERIC(10,2) NOT NULL,
    originalpreis    NUMERIC(10,2),                        -- Durchgestrichener UVP
    waehrung         CHAR(3)      NOT NULL DEFAULT 'EUR',
    kategorie_id     INTEGER      REFERENCES sebo.kategorien(id) ON DELETE SET NULL,
    zustand          VARCHAR(30)  NOT NULL DEFAULT 'gut'
                     CHECK (zustand IN ('sehr_gut', 'gut', 'akzeptabel', 'restauriert')),
    era              VARCHAR(50),                           -- z.B. "1960er", "Art Déco"
    herkunft         VARCHAR(100),                          -- Land/Region
    material         VARCHAR(200),
    abmessungen      JSONB,                                 -- {breite, hoehe, tiefe, gewicht}
    lagerbestand     SMALLINT     NOT NULL DEFAULT 1,
    verkauft         BOOLEAN      NOT NULL DEFAULT false,
    featured         BOOLEAN      NOT NULL DEFAULT false,
    seo_titel        VARCHAR(70),
    seo_beschreibung VARCHAR(160),
    tags             TEXT[]       DEFAULT '{}',
    meta             JSONB        NOT NULL DEFAULT '{}',
    erstellt_am      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    aktualisiert_am  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    veroeffentlicht_am TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_produkte_slug      ON sebo.produkte(slug);
CREATE INDEX idx_produkte_kategorie ON sebo.produkte(kategorie_id);
CREATE INDEX idx_produkte_preis     ON sebo.produkte(preis);
CREATE INDEX idx_produkte_era       ON sebo.produkte(era);
CREATE INDEX idx_produkte_featured  ON sebo.produkte(featured) WHERE featured = true;
CREATE INDEX idx_produkte_verfuegbar ON sebo.produkte(lagerbestand, verkauft);
CREATE INDEX idx_produkte_tags      ON sebo.produkte USING GIN(tags);
CREATE INDEX idx_produkte_fts       ON sebo.produkte
    USING GIN(to_tsvector('german',
        coalesce(name, '') || ' ' ||
        coalesce(kurzbeschreibung, '') || ' ' ||
        coalesce(beschreibung, '') || ' ' ||
        coalesce(era, '') || ' ' ||
        coalesce(material, '')
    ));

-- ---------------------------------------------------------------------------
-- Produktbilder
-- ---------------------------------------------------------------------------
CREATE TABLE sebo.produktbilder (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    produkt_id    UUID        NOT NULL REFERENCES sebo.produkte(id) ON DELETE CASCADE,
    url           VARCHAR(500) NOT NULL,
    alt_text      VARCHAR(200),
    sortierung    SMALLINT    NOT NULL DEFAULT 0,
    ist_hauptbild BOOLEAN     NOT NULL DEFAULT false,
    breite        SMALLINT,
    hoehe         SMALLINT,
    dateigroesse  INTEGER,                                  -- Bytes
    erstellt_am   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bilder_produkt ON sebo.produktbilder(produkt_id, sortierung);

-- Nur ein Hauptbild pro Produkt (partial unique index)
CREATE UNIQUE INDEX idx_bilder_hauptbild
    ON sebo.produktbilder(produkt_id)
    WHERE ist_hauptbild = true;

-- ---------------------------------------------------------------------------
-- Wunschliste  (cookie/session-basiert, anonym)
-- ---------------------------------------------------------------------------
CREATE TABLE sebo.wunschliste (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token VARCHAR(255) NOT NULL,
    produkt_id    UUID        NOT NULL REFERENCES sebo.produkte(id) ON DELETE CASCADE,
    erstellt_am   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(session_token, produkt_id)
);

CREATE INDEX idx_wunschliste_token ON sebo.wunschliste(session_token);

-- ---------------------------------------------------------------------------
-- Kontaktanfragen
-- ---------------------------------------------------------------------------
CREATE TABLE sebo.kontaktanfragen (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    betreff     VARCHAR(200),
    nachricht   TEXT         NOT NULL,
    produkt_id  UUID         REFERENCES sebo.produkte(id) ON DELETE SET NULL,
    status      VARCHAR(20)  NOT NULL DEFAULT 'neu'
                CHECK (status IN ('neu', 'gelesen', 'beantwortet', 'archiviert')),
    ip_adresse  INET,
    erstellt_am TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_kontakt_status     ON sebo.kontaktanfragen(status);
CREATE INDEX idx_kontakt_erstellt   ON sebo.kontaktanfragen(erstellt_am DESC);

-- ---------------------------------------------------------------------------
-- Preishistorie  (automatisch via Trigger)
-- ---------------------------------------------------------------------------
CREATE TABLE sebo.preishistorie (
    id           SERIAL      PRIMARY KEY,
    produkt_id   UUID        NOT NULL REFERENCES sebo.produkte(id) ON DELETE CASCADE,
    alter_preis  NUMERIC(10,2) NOT NULL,
    neuer_preis  NUMERIC(10,2) NOT NULL,
    geaendert_von UUID        REFERENCES sebo.benutzer(id) ON DELETE SET NULL,
    geaendert_am TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_preishist_produkt ON sebo.preishistorie(produkt_id, geaendert_am DESC);

-- ---------------------------------------------------------------------------
-- NextAuth v5  – DB Sessions & Verification Tokens
-- ---------------------------------------------------------------------------
CREATE TABLE sebo.sessions (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    benutzer_id   UUID        NOT NULL REFERENCES sebo.benutzer(id) ON DELETE CASCADE,
    expires       TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sessions_token   ON sebo.sessions(session_token);
CREATE INDEX idx_sessions_expires ON sebo.sessions(expires);

CREATE TABLE sebo.verification_tokens (
    identifier VARCHAR(255) NOT NULL,
    token      VARCHAR(255) NOT NULL,
    expires    TIMESTAMPTZ  NOT NULL,
    PRIMARY KEY (identifier, token)
);

-- ---------------------------------------------------------------------------
-- Trigger: aktualisiert_am automatisch setzen
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sebo.set_aktualisiert_am()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.aktualisiert_am = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_produkte_aktualisiert
    BEFORE UPDATE ON sebo.produkte
    FOR EACH ROW EXECUTE FUNCTION sebo.set_aktualisiert_am();

CREATE TRIGGER trg_benutzer_aktualisiert
    BEFORE UPDATE ON sebo.benutzer
    FOR EACH ROW EXECUTE FUNCTION sebo.set_aktualisiert_am();

-- ---------------------------------------------------------------------------
-- Trigger: Preishistorie automatisch erfassen
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sebo.log_preisaenderung()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.preis IS DISTINCT FROM NEW.preis THEN
        INSERT INTO sebo.preishistorie (produkt_id, alter_preis, neuer_preis)
        VALUES (NEW.id, OLD.preis, NEW.preis);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_preishistorie
    AFTER UPDATE OF preis ON sebo.produkte
    FOR EACH ROW EXECUTE FUNCTION sebo.log_preisaenderung();

-- ---------------------------------------------------------------------------
-- Seed: Standard-Kategorien
-- ---------------------------------------------------------------------------
INSERT INTO sebo.kategorien (name, slug, beschreibung, sortierung) VALUES
    ('Möbel',        'moebel',       'Vintage-Möbel aller Epochen',          1),
    ('Deko',         'deko',         'Dekorationsobjekte und Zierrat',        2),
    ('Porzellan',    'porzellan',    'Geschirr, Figuren und Vasen',           3),
    ('Beleuchtung',  'beleuchtung',  'Lampen, Leuchten und Kronleuchter',     4),
    ('Textilien',    'textilien',    'Stoffe, Teppiche und Stickereien',      5),
    ('Schmuck',      'schmuck',      'Vintage-Schmuck und Accessoires',       6),
    ('Kunst',        'kunst',        'Gemälde, Grafiken und Skulpturen',      7),
    ('Küche',        'kueche',       'Vintage-Küchenutensilien und -geräte',  8);


-- =============================================================================
-- 003_affiliate_schema.sql
-- =============================================================================
-- =============================================================================
-- vintage-market · Affiliate-System Schema
-- Multi-Level (max. 3 Ebenen) + Tracking + Provisionen + Auszahlungen
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- für IBAN-Verschlüsselung
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive E-Mail

-- ---------------------------------------------------------------------------
-- Affiliate-Accounts (eigenständig, nicht in sebo.benutzer)
-- ---------------------------------------------------------------------------
CREATE TABLE sebo.affiliates (
    id                        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email                     CITEXT       UNIQUE NOT NULL,
    passwort_hash             VARCHAR(255) NOT NULL,
    vorname                   VARCHAR(100) NOT NULL,
    nachname                  VARCHAR(100) NOT NULL,

    -- Affiliate-Programm
    referral_code             VARCHAR(16)  UNIQUE NOT NULL,
    sponsor_id                UUID         REFERENCES sebo.affiliates(id) ON DELETE SET NULL,
    ebene_im_baum             SMALLINT     NOT NULL DEFAULT 0,

    status                    VARCHAR(20)  NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','aktiv','gesperrt','geloescht')),

    -- Auszahlungsdaten
    auszahlungs_methode       VARCHAR(20)  DEFAULT 'sepa'
                              CHECK (auszahlungs_methode IN ('sepa','paypal')),
    iban_verschluesselt       BYTEA,                          -- pgcrypto pgp_sym_encrypt
    bic                       VARCHAR(11),
    kontoinhaber              VARCHAR(200),
    paypal_email              CITEXT,

    -- Steuer (DE)
    steuer_id                 VARCHAR(20),
    ist_kleinunternehmer      BOOLEAN      NOT NULL DEFAULT true,
    gewerbe_angemeldet        BOOLEAN      NOT NULL DEFAULT false,

    -- Compliance
    agb_version_akzeptiert    VARCHAR(10),
    agb_akzeptiert_am         TIMESTAMPTZ,
    datenschutz_akzeptiert_am TIMESTAMPTZ,

    -- Freischaltung
    freigeschaltet_am         TIMESTAMPTZ,
    freigeschaltet_von        UUID         REFERENCES sebo.benutzer(id) ON DELETE SET NULL,
    sperr_grund               TEXT,

    -- Audit
    letzter_login_am          TIMESTAMPTZ,
    erstellt_am               TIMESTAMPTZ  NOT NULL DEFAULT now(),
    aktualisiert_am           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_affiliates_referral_code ON sebo.affiliates(referral_code);
CREATE INDEX idx_affiliates_sponsor       ON sebo.affiliates(sponsor_id);
CREATE INDEX idx_affiliates_status        ON sebo.affiliates(status);
CREATE INDEX idx_affiliates_email         ON sebo.affiliates(email);

CREATE TRIGGER trg_affiliates_updated
    BEFORE UPDATE ON sebo.affiliates
    FOR EACH ROW EXECUTE FUNCTION sebo.update_aktualisiert_am();

-- ---------------------------------------------------------------------------
-- Klick-Tracking (kurzlebig, Cleanup-Job nach 90 Tagen)
-- ---------------------------------------------------------------------------
CREATE TABLE sebo.affiliate_klicks (
    id              BIGSERIAL    PRIMARY KEY,
    referral_code   VARCHAR(16)  NOT NULL,
    affiliate_id    UUID         REFERENCES sebo.affiliates(id) ON DELETE CASCADE,
    ip_hash         VARCHAR(64),                                -- sha256(ip + salt)
    ua_hash         VARCHAR(64),                                -- sha256(user-agent)
    referer         TEXT,
    landing_url     TEXT,
    user_agent      TEXT,                                       -- für Bot-Analyse
    ist_bot         BOOLEAN      NOT NULL DEFAULT false,
    erstellt_am     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_klicks_affiliate_zeit ON sebo.affiliate_klicks(affiliate_id, erstellt_am DESC);
CREATE INDEX idx_klicks_code           ON sebo.affiliate_klicks(referral_code);
CREATE INDEX idx_klicks_erstellt       ON sebo.affiliate_klicks(erstellt_am);  -- für Cleanup

-- ---------------------------------------------------------------------------
-- Attribution: Welche Kontaktanfrage gehört zu welchem Affiliate?
-- ---------------------------------------------------------------------------
CREATE TABLE sebo.affiliate_attributionen (
    id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    kontaktanfrage_id        UUID         UNIQUE NOT NULL
                             REFERENCES sebo.kontaktanfragen(id) ON DELETE CASCADE,
    affiliate_id             UUID         NOT NULL
                             REFERENCES sebo.affiliates(id) ON DELETE CASCADE,
    referral_code_snapshot   VARCHAR(16)  NOT NULL,
    klick_id                 BIGINT       REFERENCES sebo.affiliate_klicks(id) ON DELETE SET NULL,
    ip_hash                  VARCHAR(64),
    ua_hash                  VARCHAR(64),
    flag_verdaechtig         BOOLEAN      NOT NULL DEFAULT false,
    attribution_zeitpunkt    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_attribution_affiliate ON sebo.affiliate_attributionen(affiliate_id);

-- ---------------------------------------------------------------------------
-- Provisionen (1-3 pro Verkauf, je nach MLM-Tiefe)
-- ---------------------------------------------------------------------------
CREATE TABLE sebo.provisionen (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    attribution_id      UUID          NOT NULL REFERENCES sebo.affiliate_attributionen(id) ON DELETE CASCADE,
    kontaktanfrage_id   UUID          NOT NULL REFERENCES sebo.kontaktanfragen(id) ON DELETE CASCADE,
    produkt_id          UUID          REFERENCES sebo.produkte(id) ON DELETE SET NULL,
    verkaufspreis_cent  INTEGER       NOT NULL CHECK (verkaufspreis_cent > 0),

    affiliate_id        UUID          NOT NULL REFERENCES sebo.affiliates(id) ON DELETE CASCADE,
    ebene               SMALLINT      NOT NULL CHECK (ebene BETWEEN 1 AND 3),
    satz_prozent        NUMERIC(5,2)  NOT NULL,             -- Snapshot zum Verkaufszeitpunkt
    betrag_cent         INTEGER       NOT NULL CHECK (betrag_cent >= 0),

    status              VARCHAR(20)   NOT NULL DEFAULT 'offen'
                        CHECK (status IN ('offen','bestaetigt','storniert','ausgezahlt')),
    stornogrund         TEXT,

    auszahlung_id       UUID,                              -- FK kommt nach auszahlungen-Table

    erstellt_am         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    bestaetigt_am       TIMESTAMPTZ,
    storniert_am        TIMESTAMPTZ,
    ausgezahlt_am       TIMESTAMPTZ
);

CREATE INDEX idx_provisionen_affiliate_status ON sebo.provisionen(affiliate_id, status);
CREATE INDEX idx_provisionen_kontakt          ON sebo.provisionen(kontaktanfrage_id);
CREATE INDEX idx_provisionen_status_zeit      ON sebo.provisionen(status, erstellt_am);  -- für Cron

-- ---------------------------------------------------------------------------
-- Auszahlungen (Batches)
-- ---------------------------------------------------------------------------
CREATE TABLE sebo.auszahlungen (
    id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id          UUID         NOT NULL REFERENCES sebo.affiliates(id) ON DELETE CASCADE,
    betrag_cent           INTEGER      NOT NULL CHECK (betrag_cent > 0),
    methode               VARCHAR(20)  NOT NULL CHECK (methode IN ('sepa','paypal')),
    referenz              VARCHAR(100),                    -- z.B. SEPA-Verwendungszweck
    pdf_pfad              VARCHAR(500),                    -- Gutschrift-PDF
    notiz                 TEXT,
    status                VARCHAR(20)  NOT NULL DEFAULT 'erstellt'
                          CHECK (status IN ('erstellt','bezahlt','storniert')),
    bezahlt_am            TIMESTAMPTZ,
    bezahlt_von_admin_id  UUID         REFERENCES sebo.benutzer(id) ON DELETE SET NULL,
    erstellt_am           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_auszahlungen_affiliate ON sebo.auszahlungen(affiliate_id);
CREATE INDEX idx_auszahlungen_status    ON sebo.auszahlungen(status);

-- Provisionen → Auszahlung FK nachträglich (zirkuläre Referenz)
ALTER TABLE sebo.provisionen
    ADD CONSTRAINT fk_provisionen_auszahlung
    FOREIGN KEY (auszahlung_id) REFERENCES sebo.auszahlungen(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Einstellungen (Singleton, key/value)
-- ---------------------------------------------------------------------------
CREATE TABLE sebo.affiliate_einstellungen (
    schluessel  VARCHAR(50)  PRIMARY KEY,
    wert        TEXT         NOT NULL,
    beschreibung TEXT,
    aktualisiert_am TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO sebo.affiliate_einstellungen (schluessel, wert, beschreibung) VALUES
    ('provision_ebene_1_prozent', '10',  'Direktprovision in Prozent (Ebene 1)'),
    ('provision_ebene_2_prozent', '3',   'Sponsor-Provision in Prozent (Ebene 2)'),
    ('provision_ebene_3_prozent', '0',   'Ebene 3 deaktiviert (Schneeballsystem-Risiko)'),
    ('cookie_ttl_tage',           '30',  'Cookie-Lebensdauer in Tagen'),
    ('mindestauszahlung_cent',    '2000','Mindestbetrag für Auszahlung (20 EUR)'),
    ('widerrufs_frist_tage',      '14',  'Wartezeit vor Status offen→bestaetigt'),
    ('registrierung_offen',       'true','Neue Affiliate-Registrierungen erlaubt'),
    ('agb_aktuelle_version',      '1.0', 'Aktuelle AGB-Version für Affiliates')
ON CONFLICT (schluessel) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Erweiterung sebo.kontaktanfragen → "verkauft" Status + Verkaufsdaten
-- ---------------------------------------------------------------------------
ALTER TABLE sebo.kontaktanfragen
    DROP CONSTRAINT IF EXISTS kontaktanfragen_status_check;

ALTER TABLE sebo.kontaktanfragen
    ADD CONSTRAINT kontaktanfragen_status_check
    CHECK (status IN ('neu','gelesen','beantwortet','verkauft','archiviert'));

ALTER TABLE sebo.kontaktanfragen
    ADD COLUMN IF NOT EXISTS verkaufspreis_cent     INTEGER,
    ADD COLUMN IF NOT EXISTS verkauft_am            TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS verkauft_von_admin_id  UUID REFERENCES sebo.benutzer(id) ON DELETE SET NULL;

-- =============================================================================
-- ENDE 003_affiliate_schema.sql
-- =============================================================================


-- =============================================================================
-- 003_seed.sql
-- =============================================================================
-- =============================================================================
-- vintage-market · Seed-Daten
-- Erster Admin-Benutzer (Passwort: Admin1234! – in Produktion sofort ändern!)
-- Demo-Produkte für Entwicklung
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Admin-Benutzer
-- Passwort: Admin1234!  (bcrypt-Hash, rounds=12)
-- WICHTIG: In Produktion via Script mit sicherem Passwort neu generieren!
-- ---------------------------------------------------------------------------
INSERT INTO sebo.benutzer (email, passwort_hash, name, rolle) VALUES
(
    'admin@galeriedutemps.kz',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBaLWbMPLOklwS',
    'Administrator',
    'superadmin'
)
ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Demo-Produkte (nur für Entwicklung, in Produktion entfernen)
-- ---------------------------------------------------------------------------
INSERT INTO sebo.produkte
    (name, slug, beschreibung, kurzbeschreibung, preis, originalpreis,
     kategorie_id, zustand, era, herkunft, material, lagerbestand, featured, tags)
VALUES
(
    'Biedermeier Kommode',
    'biedermeier-kommode',
    'Wunderschöne Biedermeier-Kommode aus der ersten Hälfte des 19. Jahrhunderts. Kirschholzfurnier auf Nadelholz. Vier Schubladen mit originalen Messinggriffen. Restauriert und gewachst.',
    'Authentische Biedermeier-Kommode, Kirschholz, ca. 1830',
    2400.00, 2800.00,
    (SELECT id FROM sebo.kategorien WHERE slug = 'moebel'),
    'restauriert', '1830er', 'Deutschland', 'Kirschholz, Nadelholz',
    1, true,
    ARRAY['biedermeier', 'kommode', 'kirschholz', 'antik']
),
(
    'Art Déco Tischlampe',
    'art-deco-tischlampe',
    'Elegante Tischlampe im Art-Déco-Stil, 1920er Jahre. Bronzefuß, original Glasschirm mit geometrischem Muster. Elektrisch neu verdrahtet, sicher verwendbar.',
    'Original Art-Déco Lampe, Bronze & Glas, 1920er',
    380.00, NULL,
    (SELECT id FROM sebo.kategorien WHERE slug = 'beleuchtung'),
    'sehr_gut', '1920er', 'Frankreich', 'Bronze, Opalglas',
    1, true,
    ARRAY['art deco', 'lampe', 'bronze', '1920er']
),
(
    'Meissener Porzellan Vase',
    'meissener-porzellan-vase',
    'Meissener Porzellanvase mit handgemaltem Blumendekor, Schwertermarke vorhanden. Höhe ca. 28 cm. Keine Beschädigungen oder Restaurierungen.',
    'Meissen Vase mit Blumendekor, signiert',
    650.00, NULL,
    (SELECT id FROM sebo.kategorien WHERE slug = 'porzellan'),
    'sehr_gut', '1890er', 'Deutschland (Meissen)', 'Porzellan',
    1, false,
    ARRAY['meissen', 'porzellan', 'vase', 'blumendekor', 'signiert']
)
ON CONFLICT (slug) DO NOTHING;


-- =============================================================================
-- 004_polish.sql
-- =============================================================================
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
-- ENDE 004_polish.sql
-- =============================================================================


-- =============================================================================
-- 005_ecommerce.sql
-- =============================================================================
-- =============================================================================
-- vintage-market · Phase 10a: E-Commerce-Fundament
-- Customer-Accounts, Orders, Coupons, Stock-Movements
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Customers (Endkund:innen — separate Tabelle, NICHT in benutzer/affiliates)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sebo.customers (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email               CITEXT       UNIQUE NOT NULL,
    passwort_hash       VARCHAR(255),                         -- NULL = nur Magic-Link
    customer_number     SERIAL       UNIQUE,                  -- KD-001, KD-002, ...
    vorname             VARCHAR(100),
    nachname            VARCHAR(100),
    telefon             VARCHAR(50),

    -- Customer-Type für B2B-Flow (Phase 10c)
    customer_type       VARCHAR(20)  NOT NULL DEFAULT 'b2c'
                        CHECK (customer_type IN ('b2c', 'b2b_pending', 'b2b_verified', 'b2b_rejected')),
    company_name        VARCHAR(200),
    ust_id              VARCHAR(20),                          -- USt-IdNr.
    company_note        TEXT,                                 -- Begründung wenn keine UID

    -- Rechnungs-/Lieferadresse als JSONB (flexibel)
    billing_address     JSONB DEFAULT '{}',                   -- {strasse, plz, ort, land, ...}
    shipping_address    JSONB DEFAULT '{}',

    -- Marketing/Newsletter
    newsletter_aktiv    BOOLEAN      NOT NULL DEFAULT false,
    newsletter_bestaetigt_am TIMESTAMPTZ,
    dnc_token           VARCHAR(64)  UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
    geburtsdatum        DATE,                                 -- für Geburtstags-Coupons

    -- Compliance
    agb_akzeptiert_am   TIMESTAMPTZ,
    email_bestaetigt_am TIMESTAMPTZ,                          -- Double-Opt-In Account

    letzter_login_am    TIMESTAMPTZ,
    erstellt_am         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    aktualisiert_am     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_email    ON sebo.customers(email);
CREATE INDEX idx_customers_type     ON sebo.customers(customer_type);
CREATE INDEX idx_customers_dnc      ON sebo.customers(dnc_token);

CREATE TRIGGER trg_customers_updated
    BEFORE UPDATE ON sebo.customers
    FOR EACH ROW EXECUTE FUNCTION sebo.update_aktualisiert_am();

-- ---------------------------------------------------------------------------
-- 2. Coupons / Gutscheine
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sebo.coupons (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    code               VARCHAR(50)  UNIQUE NOT NULL,
    beschreibung       VARCHAR(200),

    -- Rabatt-Typ
    typ                VARCHAR(20)  NOT NULL CHECK (typ IN ('prozent', 'fest')),
    wert               NUMERIC(10,2) NOT NULL CHECK (wert >= 0),

    -- Limits
    min_bestellwert_cent INTEGER    NOT NULL DEFAULT 0,
    max_rabatt_cent    INTEGER,                              -- Cap bei Prozent-Coupons
    nutzungen_max      INTEGER,                              -- NULL = unbegrenzt
    nutzungen_pro_user INTEGER      NOT NULL DEFAULT 1,

    -- Gültigkeit
    gueltig_ab         TIMESTAMPTZ,
    gueltig_bis        TIMESTAMPTZ,
    aktiv              BOOLEAN      NOT NULL DEFAULT true,

    -- Zielgruppe
    nur_b2b            BOOLEAN      NOT NULL DEFAULT false,
    nur_b2c            BOOLEAN      NOT NULL DEFAULT false,
    nur_neue_kunden    BOOLEAN      NOT NULL DEFAULT false,

    -- Audit
    erstellt_von       UUID         REFERENCES sebo.benutzer(id) ON DELETE SET NULL,
    erstellt_am        TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- Counter
    nutzungen_aktuell  INTEGER      NOT NULL DEFAULT 0
);

CREATE INDEX idx_coupons_code   ON sebo.coupons(code);
CREATE INDEX idx_coupons_aktiv  ON sebo.coupons(aktiv, gueltig_bis);

-- ---------------------------------------------------------------------------
-- 3. Orders (Bestellungen)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sebo.orders (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number         SERIAL       UNIQUE,                -- GDT-1001, GDT-1002, ...
    customer_id          UUID         REFERENCES sebo.customers(id) ON DELETE SET NULL,
    customer_email       CITEXT       NOT NULL,              -- Gast-Bestellung möglich
    customer_name        VARCHAR(200),

    -- Status-Lebenszyklus
    status               VARCHAR(20)  NOT NULL DEFAULT 'pending'
                         CHECK (status IN (
                           'pending',       -- erstellt, wartet auf Zahlung (Stripe)
                           'paid',          -- bezahlt, in Bearbeitung
                           'fulfilled',     -- versandt
                           'completed',     -- abgeschlossen (geliefert + Frist abgelaufen)
                           'cancelled',     -- abgebrochen / storniert
                           'refunded'       -- zurückerstattet
                         )),

    -- Beträge (alles in Cent, EUR)
    subtotal_cents       INTEGER      NOT NULL DEFAULT 0,
    rabatt_cents         INTEGER      NOT NULL DEFAULT 0,
    versand_cents        INTEGER      NOT NULL DEFAULT 0,
    tax_total_cents      INTEGER      NOT NULL DEFAULT 0,
    total_cents          INTEGER      NOT NULL,
    waehrung             CHAR(3)      NOT NULL DEFAULT 'EUR',

    -- Adressen (Snapshot zum Zeitpunkt der Bestellung)
    billing_address      JSONB        NOT NULL DEFAULT '{}',
    shipping_address     JSONB        NOT NULL DEFAULT '{}',
    versandart           VARCHAR(50),                         -- 'standard', 'abholung', 'express'

    -- Coupon
    coupon_id            UUID         REFERENCES sebo.coupons(id) ON DELETE SET NULL,
    coupon_code_snapshot VARCHAR(50),

    -- B2B-Daten (Phase 10c)
    customer_type_snapshot VARCHAR(20) NOT NULL DEFAULT 'b2c',
    reverse_charge       BOOLEAN      NOT NULL DEFAULT false,
    ust_id_snapshot      VARCHAR(20),

    -- Affiliate-Verknüpfung (für Provisionsberechnung, siehe Phase 9)
    affiliate_attribution_id UUID,                            -- FK später falls Refactor

    -- Stripe
    stripe_session_id    VARCHAR(255),
    stripe_payment_intent VARCHAR(255),
    bezahlt_am           TIMESTAMPTZ,

    -- Versand-Tracking
    versendet_am         TIMESTAMPTZ,
    tracking_nummer      VARCHAR(100),
    tracking_url         TEXT,

    -- Storno
    storniert_am         TIMESTAMPTZ,
    storniert_grund      TEXT,

    -- Notiz / interne Kommentare
    interne_notiz        TEXT,
    kunden_notiz         TEXT,

    -- Audit
    erstellt_am          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    aktualisiert_am      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_customer    ON sebo.orders(customer_id);
CREATE INDEX idx_orders_status      ON sebo.orders(status, erstellt_am DESC);
CREATE INDEX idx_orders_stripe      ON sebo.orders(stripe_session_id);
CREATE INDEX idx_orders_email       ON sebo.orders(customer_email);

CREATE TRIGGER trg_orders_updated
    BEFORE UPDATE ON sebo.orders
    FOR EACH ROW EXECUTE FUNCTION sebo.update_aktualisiert_am();

-- ---------------------------------------------------------------------------
-- 4. Order-Items (mit Pro-Position-Steuer für Mixed Carts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sebo.order_items (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id           UUID         NOT NULL REFERENCES sebo.orders(id) ON DELETE CASCADE,
    produkt_id         UUID         REFERENCES sebo.produkte(id) ON DELETE SET NULL,

    -- Snapshot zum Bestellzeitpunkt (Produkt kann später gelöscht/geändert werden)
    produkt_name       VARCHAR(300) NOT NULL,
    produkt_slug       VARCHAR(350),
    produkt_bild_url   VARCHAR(500),

    menge              INTEGER      NOT NULL CHECK (menge > 0),
    einzelpreis_cents  INTEGER      NOT NULL CHECK (einzelpreis_cents >= 0),
    rabatt_cents       INTEGER      NOT NULL DEFAULT 0,

    -- Steuer pro Position (für Mixed Carts mit Bildung+Ware)
    tax_rate           NUMERIC(5,2) NOT NULL DEFAULT 19.00,   -- DE 19%, AT 20%, Bildung 0%
    tax_amount_cents   INTEGER      NOT NULL DEFAULT 0,
    tax_exempt         BOOLEAN      NOT NULL DEFAULT false,   -- Bildungsleistung, Versand etc.

    -- Berechnete Summe (inkl. Rabatt, inkl. Steuer)
    zeile_total_cents  INTEGER      NOT NULL,

    erstellt_am        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order ON sebo.order_items(order_id);

-- ---------------------------------------------------------------------------
-- 5. Stock-Movements (Lager-Bewegungen für Audit + Restock bei Cancel)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sebo.stock_movements (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    produkt_id      UUID         NOT NULL REFERENCES sebo.produkte(id) ON DELETE CASCADE,
    typ             VARCHAR(30)  NOT NULL CHECK (typ IN (
                      'order_reserve',   -- Bestellung erstellt → Lager reserviert
                      'order_release',   -- Bestellung canceled → Lager zurück
                      'admin_adjust',    -- Manuelle Anpassung
                      'restock'          -- Wareneingang
                    )),
    menge_delta     INTEGER      NOT NULL,                    -- + oder -
    order_id        UUID         REFERENCES sebo.orders(id) ON DELETE SET NULL,
    notiz           TEXT,
    erstellt_von    UUID         REFERENCES sebo.benutzer(id) ON DELETE SET NULL,
    erstellt_am     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_produkt ON sebo.stock_movements(produkt_id, erstellt_am DESC);

-- ---------------------------------------------------------------------------
-- 6. Coupon-Nutzungen (Tracking pro Customer)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sebo.coupon_nutzungen (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id       UUID         NOT NULL REFERENCES sebo.coupons(id) ON DELETE CASCADE,
    order_id        UUID         NOT NULL REFERENCES sebo.orders(id) ON DELETE CASCADE,
    customer_id     UUID         REFERENCES sebo.customers(id) ON DELETE SET NULL,
    customer_email  CITEXT,
    rabatt_cents    INTEGER      NOT NULL,
    erstellt_am     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_coupon_nutzungen_coupon ON sebo.coupon_nutzungen(coupon_id);
CREATE INDEX idx_coupon_nutzungen_customer ON sebo.coupon_nutzungen(customer_id);
CREATE INDEX idx_coupon_nutzungen_email ON sebo.coupon_nutzungen(customer_email);

-- ---------------------------------------------------------------------------
-- 7. Produkt-Erweiterung: b2c_mode (Tri-State Sichtbarkeit)
-- ---------------------------------------------------------------------------
ALTER TABLE sebo.produkte
    ADD COLUMN IF NOT EXISTS b2c_mode VARCHAR(10) NOT NULL DEFAULT 'visible'
        CHECK (b2c_mode IN ('visible', 'teaser', 'hidden')),
    ADD COLUMN IF NOT EXISTS b2b_preis_cents INTEGER,         -- B2B-Großhandelspreis (NULL = Standard)
    ADD COLUMN IF NOT EXISTS tax_exempt BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS gewicht_gramm INTEGER,           -- für Versandkosten-Berechnung
    ADD COLUMN IF NOT EXISTS ist_seminar BOOLEAN NOT NULL DEFAULT false;  -- Bildungsleistung

CREATE INDEX IF NOT EXISTS idx_produkte_b2c_mode ON sebo.produkte(b2c_mode);

-- =============================================================================
-- ENDE 005_ecommerce.sql
-- =============================================================================


-- =============================================================================
-- 006_customer_b2b_invoices.sql
-- =============================================================================
-- =============================================================================
-- vintage-market · Phase 10b/c/e
-- Customer-Auth-Token, B2B-Rabattstaffel, Rechnungs-Numerierung
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Customer Auth-Token (E-Mail-Bestätigung + Passwort-Reset)
-- ---------------------------------------------------------------------------
ALTER TABLE sebo.customers
    ADD COLUMN IF NOT EXISTS email_confirmation_token   VARCHAR(64),
    ADD COLUMN IF NOT EXISTS email_confirmation_expires TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS password_reset_token       VARCHAR(64),
    ADD COLUMN IF NOT EXISTS password_reset_expires     TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_customers_email_token ON sebo.customers(email_confirmation_token);
CREATE INDEX IF NOT EXISTS idx_customers_reset_token ON sebo.customers(password_reset_token);

-- ---------------------------------------------------------------------------
-- 2. B2B-Rabattstaffel (Mengen-Rabatte)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sebo.discount_tiers (
    id              SERIAL       PRIMARY KEY,
    customer_type   VARCHAR(20)  NOT NULL DEFAULT 'b2b_verified'
                    CHECK (customer_type IN ('b2c','b2b_verified')),
    min_summe_cent  INTEGER      NOT NULL,
    rabatt_prozent  NUMERIC(5,2) NOT NULL CHECK (rabatt_prozent BETWEEN 0 AND 50),
    label           VARCHAR(100),
    aktiv           BOOLEAN      NOT NULL DEFAULT true,
    erstellt_am     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tiers_type ON sebo.discount_tiers(customer_type, min_summe_cent);

-- Standard-Staffel (B2B): 5% ab 200€, 10% ab 500€, 15% ab 1000€
INSERT INTO sebo.discount_tiers (customer_type, min_summe_cent, rabatt_prozent, label)
VALUES
    ('b2b_verified', 20000,  5.00, 'B2B Stufe 1 (ab 200 €)'),
    ('b2b_verified', 50000, 10.00, 'B2B Stufe 2 (ab 500 €)'),
    ('b2b_verified', 100000, 15.00, 'B2B Stufe 3 (ab 1000 €)')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Rechnungen (separate Numerierung als Order-Number)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sebo.invoices (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number    SERIAL       UNIQUE,                    -- RG-1001, RG-1002
    order_id          UUID         NOT NULL REFERENCES sebo.orders(id) ON DELETE CASCADE,
    customer_id       UUID         REFERENCES sebo.customers(id) ON DELETE SET NULL,

    -- Snapshot (für rechtssichere Aufbewahrung 10 Jahre)
    rechnungs_datum   DATE         NOT NULL DEFAULT CURRENT_DATE,
    leistungs_datum   DATE,
    faellig_am        DATE,

    -- Beträge (Snapshot)
    netto_cents       INTEGER      NOT NULL,
    tax_cents         INTEGER      NOT NULL,
    brutto_cents      INTEGER      NOT NULL,
    waehrung          CHAR(3)      NOT NULL DEFAULT 'EUR',

    -- Empfänger-Snapshot
    empfaenger_name   VARCHAR(200),
    empfaenger_email  CITEXT,
    empfaenger_adresse JSONB        NOT NULL DEFAULT '{}',
    empfaenger_ust_id VARCHAR(20),

    -- Reverse-Charge / §19 Hinweise
    reverse_charge    BOOLEAN      NOT NULL DEFAULT false,
    kleinunternehmer  BOOLEAN      NOT NULL DEFAULT false,
    bildungsleistung  BOOLEAN      NOT NULL DEFAULT false,

    -- Status
    status            VARCHAR(20)  NOT NULL DEFAULT 'offen'
                      CHECK (status IN ('offen','bezahlt','storniert','gutschrift')),
    bezahlt_am        TIMESTAMPTZ,

    erstellt_am       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (order_id)                                          -- 1 Rechnung pro Order
);

CREATE INDEX IF NOT EXISTS idx_invoices_order    ON sebo.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON sebo.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status   ON sebo.invoices(status);

-- =============================================================================
-- ENDE 006_customer_b2b_invoices.sql
-- =============================================================================


-- =============================================================================
-- 007_crm.sql
-- =============================================================================
-- =============================================================================
-- vintage-market · Phase 10h: CRM Core
-- Pipeline, Tags, Notes, Tasks, Segments, Drip-Flows, Event-Tracking
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Pipeline-Stages (Kanban-Spalten)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sebo.pipeline_stages (
    id            SERIAL       PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    farbe         VARCHAR(20)  NOT NULL DEFAULT '#9B9B9B',
    sortierung    INTEGER      NOT NULL DEFAULT 0,
    ist_initial   BOOLEAN      NOT NULL DEFAULT false,
    ist_final     BOOLEAN      NOT NULL DEFAULT false,
    aktiv         BOOLEAN      NOT NULL DEFAULT true,
    erstellt_am   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Standard-Stages
INSERT INTO sebo.pipeline_stages (name, farbe, sortierung, ist_initial) VALUES
    ('Lead',          '#C9A84C', 10, true),
    ('Qualifiziert',  '#B87333', 20, false),
    ('Kunde',         '#7A9E7E', 30, false),
    ('VIP',           '#4A2C1A', 40, false),
    ('Inaktiv',       '#9B9B9B', 90, false)
ON CONFLICT DO NOTHING;

-- Customer-Erweiterung
ALTER TABLE sebo.customers
    ADD COLUMN IF NOT EXISTS pipeline_stage_id INTEGER REFERENCES sebo.pipeline_stages(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS crm_score         INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_customers_pipeline ON sebo.customers(pipeline_stage_id);

-- Default-Stage (Lead) für alle neuen Customer per Trigger
CREATE OR REPLACE FUNCTION sebo.set_initial_stage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.pipeline_stage_id IS NULL THEN
        SELECT id INTO NEW.pipeline_stage_id
        FROM sebo.pipeline_stages WHERE ist_initial = true AND aktiv = true LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customers_initial_stage ON sebo.customers;
CREATE TRIGGER trg_customers_initial_stage
    BEFORE INSERT ON sebo.customers
    FOR EACH ROW EXECUTE FUNCTION sebo.set_initial_stage();

-- ---------------------------------------------------------------------------
-- 2. Tags (frei wählbare Labels für Segmentierung)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sebo.tags (
    id            SERIAL       PRIMARY KEY,
    name          VARCHAR(50)  UNIQUE NOT NULL,
    farbe         VARCHAR(20)  NOT NULL DEFAULT '#C9A84C',
    beschreibung  TEXT,
    erstellt_am   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sebo.customer_tags (
    customer_id   UUID         REFERENCES sebo.customers(id) ON DELETE CASCADE,
    tag_id        INTEGER      REFERENCES sebo.tags(id)      ON DELETE CASCADE,
    erstellt_am   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    erstellt_von  UUID         REFERENCES sebo.benutzer(id)  ON DELETE SET NULL,
    PRIMARY KEY (customer_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_tags_customer ON sebo.customer_tags(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_tag      ON sebo.customer_tags(tag_id);

-- ---------------------------------------------------------------------------
-- 3. Notizen (interne Notes pro Customer)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sebo.notes (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id   UUID         NOT NULL REFERENCES sebo.customers(id) ON DELETE CASCADE,
    inhalt        TEXT         NOT NULL,
    pinned        BOOLEAN      NOT NULL DEFAULT false,
    erstellt_von  UUID         REFERENCES sebo.benutzer(id) ON DELETE SET NULL,
    erstellt_am   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_customer ON sebo.notes(customer_id, pinned DESC, erstellt_am DESC);

-- ---------------------------------------------------------------------------
-- 4. Tasks (To-Dos für Team)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sebo.tasks (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    titel         VARCHAR(200) NOT NULL,
    beschreibung  TEXT,
    customer_id   UUID         REFERENCES sebo.customers(id) ON DELETE SET NULL,
    zugewiesen_an UUID         REFERENCES sebo.benutzer(id)  ON DELETE SET NULL,
    erstellt_von  UUID         REFERENCES sebo.benutzer(id)  ON DELETE SET NULL,
    prioritaet    VARCHAR(10)  NOT NULL DEFAULT 'normal'
                  CHECK (prioritaet IN ('niedrig','normal','hoch','dringend')),
    status        VARCHAR(20)  NOT NULL DEFAULT 'offen'
                  CHECK (status IN ('offen','in_arbeit','erledigt','abgebrochen')),
    faellig_am    TIMESTAMPTZ,
    erledigt_am   TIMESTAMPTZ,
    erstellt_am   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    aktualisiert_am TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_customer  ON sebo.tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee  ON sebo.tasks(zugewiesen_an, status);
CREATE INDEX IF NOT EXISTS idx_tasks_status    ON sebo.tasks(status, faellig_am);

CREATE TRIGGER trg_tasks_updated
    BEFORE UPDATE ON sebo.tasks
    FOR EACH ROW EXECUTE FUNCTION sebo.update_aktualisiert_am();

-- ---------------------------------------------------------------------------
-- 5. Segmente (gespeicherte Filter)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sebo.segments (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(100) NOT NULL,
    beschreibung  TEXT,
    /* Filter als JSONB, z.B.:
       {
         "customer_type": ["b2b_verified"],
         "tags":          [1, 5],
         "stage_id":      3,
         "newsletter":    true,
         "min_orders":    2,
         "min_summe_cent": 50000
       }
    */
    filter        JSONB        NOT NULL DEFAULT '{}',
    erstellt_von  UUID         REFERENCES sebo.benutzer(id) ON DELETE SET NULL,
    erstellt_am   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 6. Drip-Flows (automatisierte Mail-Sequenzen)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sebo.drip_flows (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(100) NOT NULL,
    beschreibung  TEXT,
    trigger_typ   VARCHAR(50)  NOT NULL
                  CHECK (trigger_typ IN ('signup','first_order','b2b_approved','winback','manual','tag_added')),
    trigger_param VARCHAR(100),                            -- z.B. Tag-ID bei tag_added
    segment_id    UUID         REFERENCES sebo.segments(id) ON DELETE SET NULL,
    aktiv         BOOLEAN      NOT NULL DEFAULT true,
    erstellt_am   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sebo.drip_flow_steps (
    id            SERIAL       PRIMARY KEY,
    flow_id       UUID         NOT NULL REFERENCES sebo.drip_flows(id) ON DELETE CASCADE,
    schritt_nr    INTEGER      NOT NULL,
    delay_stunden INTEGER      NOT NULL DEFAULT 0,
    betreff       VARCHAR(200) NOT NULL,
    html_content  TEXT         NOT NULL,
    UNIQUE (flow_id, schritt_nr)
);

CREATE TABLE IF NOT EXISTS sebo.drip_flow_runs (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id         UUID         NOT NULL REFERENCES sebo.drip_flows(id) ON DELETE CASCADE,
    customer_id     UUID         NOT NULL REFERENCES sebo.customers(id) ON DELETE CASCADE,
    aktueller_schritt INTEGER    NOT NULL DEFAULT 0,
    naechster_lauf  TIMESTAMPTZ,
    status          VARCHAR(20)  NOT NULL DEFAULT 'aktiv'
                    CHECK (status IN ('aktiv','abgeschlossen','abgebrochen')),
    gestartet_am    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    abgeschlossen_am TIMESTAMPTZ,
    UNIQUE (flow_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_drip_runs_cron ON sebo.drip_flow_runs(status, naechster_lauf);

-- ---------------------------------------------------------------------------
-- 7. CRM-Events (Activity-Stream / Tracking)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sebo.crm_events (
    id            BIGSERIAL    PRIMARY KEY,
    customer_id   UUID         REFERENCES sebo.customers(id) ON DELETE CASCADE,
    customer_email CITEXT,
    typ           VARCHAR(50)  NOT NULL,                   -- 'page_view', 'product_view', 'cart_add', 'login', ...
    daten         JSONB        DEFAULT '{}',
    quelle        VARCHAR(50),                             -- 'web', 'api', 'admin', 'cron'
    erstellt_am   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_events_customer ON sebo.crm_events(customer_id, erstellt_am DESC);
CREATE INDEX IF NOT EXISTS idx_crm_events_typ      ON sebo.crm_events(typ, erstellt_am DESC);
CREATE INDEX IF NOT EXISTS idx_crm_events_cleanup  ON sebo.crm_events(erstellt_am);

-- ---------------------------------------------------------------------------
-- 8. DNC-Erweiterung (Do Not Contact) – ist bereits in customers (dnc_token)
-- Status-Feld für "vollständig DNC" (kein Marketing mehr)
-- ---------------------------------------------------------------------------
ALTER TABLE sebo.customers
    ADD COLUMN IF NOT EXISTS dnc_aktiv BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS dnc_grund TEXT,
    ADD COLUMN IF NOT EXISTS dnc_seit  TIMESTAMPTZ;

-- =============================================================================
-- ENDE 007_crm.sql
-- =============================================================================


-- =============================================================================
-- 008_newsletter_journal.sql
-- =============================================================================
-- =============================================================================
-- vintage-market · Phase 10i: Newsletter + Journal
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Newsletter-Subscribers (separate Tabelle — anonyme Anmeldungen erlaubt)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sebo.newsletter_subscribers (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email             CITEXT       UNIQUE NOT NULL,
    vorname           VARCHAR(100),
    nachname          VARCHAR(100),
    customer_id       UUID         REFERENCES sebo.customers(id) ON DELETE SET NULL,
    confirmed_am      TIMESTAMPTZ,
    confirm_token     VARCHAR(64),
    confirm_expires   TIMESTAMPTZ,
    unsubscribe_token VARCHAR(64)  UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
    unsubscribed_am   TIMESTAMPTZ,
    unsubscribe_grund TEXT,
    quelle            VARCHAR(50)  DEFAULT 'website',
    erstellt_am       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_email      ON sebo.newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_confirmed  ON sebo.newsletter_subscribers(confirmed_am) WHERE unsubscribed_am IS NULL;
CREATE INDEX IF NOT EXISTS idx_newsletter_unsub      ON sebo.newsletter_subscribers(unsubscribe_token);

-- ---------------------------------------------------------------------------
-- 2. Newsletter (Issues/Kampagnen)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sebo.newsletters (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    titel         VARCHAR(200) NOT NULL,
    betreff       VARCHAR(200) NOT NULL,
    preheader     VARCHAR(200),
    /* Blocks als JSONB-Array, z.B.:
       [
         { "type": "hero",      "titel": "...", "subtitel": "...", "bild_url": "...", "cta_label": "...", "cta_url": "..." },
         { "type": "text",      "html": "..." },
         { "type": "produkt",   "produkt_slug": "..." },
         { "type": "button",    "label": "...", "url": "..." },
         { "type": "divider" }
       ]
    */
    blocks        JSONB        NOT NULL DEFAULT '[]',
    status        VARCHAR(20)  NOT NULL DEFAULT 'entwurf'
                  CHECK (status IN ('entwurf','geplant','versendet','abgebrochen')),
    segment_id    UUID         REFERENCES sebo.segments(id) ON DELETE SET NULL,
    versand_zeit  TIMESTAMPTZ,
    versendet_am  TIMESTAMPTZ,
    empfaenger_anzahl INTEGER  NOT NULL DEFAULT 0,
    geoeffnet_anzahl  INTEGER  NOT NULL DEFAULT 0,
    geklickt_anzahl   INTEGER  NOT NULL DEFAULT 0,
    erstellt_von  UUID         REFERENCES sebo.benutzer(id) ON DELETE SET NULL,
    erstellt_am   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    aktualisiert_am TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletters_status ON sebo.newsletters(status, versand_zeit);

CREATE TRIGGER trg_newsletters_updated
    BEFORE UPDATE ON sebo.newsletters
    FOR EACH ROW EXECUTE FUNCTION sebo.update_aktualisiert_am();

-- ---------------------------------------------------------------------------
-- 3. Newsletter-Sends (Tracking pro Empfänger)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sebo.newsletter_sends (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    newsletter_id   UUID         NOT NULL REFERENCES sebo.newsletters(id) ON DELETE CASCADE,
    subscriber_id   UUID         REFERENCES sebo.newsletter_subscribers(id) ON DELETE SET NULL,
    customer_id     UUID         REFERENCES sebo.customers(id) ON DELETE SET NULL,
    email           CITEXT       NOT NULL,
    versendet_am    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    geoeffnet_am    TIMESTAMPTZ,
    geklickt_am     TIMESTAMPTZ,
    bounce          BOOLEAN      NOT NULL DEFAULT false,
    UNIQUE (newsletter_id, email)
);

CREATE INDEX IF NOT EXISTS idx_sends_newsletter ON sebo.newsletter_sends(newsletter_id);

-- ---------------------------------------------------------------------------
-- 4. Journal/Blog
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sebo.journal_posts (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    titel           VARCHAR(300) NOT NULL,
    slug            VARCHAR(350) UNIQUE NOT NULL,
    excerpt         VARCHAR(500),
    cover_bild_url  VARCHAR(500),
    markdown        TEXT         NOT NULL DEFAULT '',
    autor_id        UUID         REFERENCES sebo.benutzer(id) ON DELETE SET NULL,
    autor_name      VARCHAR(100),                                 -- Snapshot falls user gelöscht
    tags            TEXT[]       NOT NULL DEFAULT '{}',
    seo_titel       VARCHAR(70),
    seo_beschreibung VARCHAR(160),
    veroeffentlicht BOOLEAN      NOT NULL DEFAULT false,
    veroeffentlicht_am TIMESTAMPTZ,
    aufrufe         INTEGER      NOT NULL DEFAULT 0,
    erstellt_am     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    aktualisiert_am TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_slug          ON sebo.journal_posts(slug);
CREATE INDEX IF NOT EXISTS idx_journal_veroeff       ON sebo.journal_posts(veroeffentlicht_am DESC) WHERE veroeffentlicht = true;
CREATE INDEX IF NOT EXISTS idx_journal_tags          ON sebo.journal_posts USING GIN(tags);

CREATE TRIGGER trg_journal_updated
    BEFORE UPDATE ON sebo.journal_posts
    FOR EACH ROW EXECUTE FUNCTION sebo.update_aktualisiert_am();

-- =============================================================================
-- ENDE 008_newsletter_journal.sql
-- =============================================================================


-- =============================================================================
-- 009_kasachstan.sql
-- =============================================================================
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


-- =============================================================================
-- 010_affiliate_kaspi.sql
-- =============================================================================
-- =============================================================================
-- vintage-market · Phase 11 (Nachzügler) — Affiliate kaspi_telefon
-- Wird benötigt, weil Auszahlungs-Methode 'kaspi' eine eigene Nummer braucht
-- (nicht zwangsläufig identisch mit der Kontakt-Nummer)
-- =============================================================================

ALTER TABLE sebo.affiliates
    ADD COLUMN IF NOT EXISTS kaspi_telefon VARCHAR(20);

-- Comment für DB-Doku
COMMENT ON COLUMN sebo.affiliates.kaspi_telefon IS
    'Kaspi.kz-Telefonnummer für Auszahlung (E.164 ohne führendes "+", z.B. 77011234567)';

-- =============================================================================
-- ENDE 010_affiliate_kaspi.sql
-- =============================================================================

