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
