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
