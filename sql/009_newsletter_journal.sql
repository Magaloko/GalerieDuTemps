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
-- ENDE 009_newsletter_journal.sql
-- =============================================================================
