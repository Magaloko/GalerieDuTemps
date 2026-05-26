-- ---------------------------------------------------------------------------
-- Migration 019: Unified-Lead-Inbox-Schema
--
-- Drei Tabellen:
--   sebo.kanal_konten   — Auth-Token-Storage für IG/Telegram/WhatsApp/Mail
--   sebo.leads          — Universal-Inbox für alle eingehenden Nachrichten
--   sebo.lead_messages  — Konversations-History (für IG-DM/Telegram, später)
--
-- Trigger spiegelt bestehende sebo.kontaktanfragen sofort als Lead.
-- Backfill bringt alle Bestands-Kontaktanfragen ins neue Modell.
-- ---------------------------------------------------------------------------

-- 1. Externe Channels ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sebo.kanal_konten (
    id                    SERIAL       PRIMARY KEY,
    kanal                 VARCHAR(20)  NOT NULL
                          CHECK (kanal IN ('instagram','telegram','whatsapp','mail')),
    account_id            VARCHAR(100),
    username              VARCHAR(100),
    access_token          TEXT,
    refresh_token         TEXT,
    token_expires_at      TIMESTAMPTZ,
    page_id               VARCHAR(100),
    webhook_verify_token  VARCHAR(100),
    webhook_secret        VARCHAR(100),
    aktiv                 BOOLEAN      NOT NULL DEFAULT true,
    meta                  JSONB        NOT NULL DEFAULT '{}',
    erstellt_am           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    aktualisiert_am       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (kanal, account_id)
);

CREATE INDEX IF NOT EXISTS idx_kanal_konten_aktiv ON sebo.kanal_konten(kanal) WHERE aktiv = true;

COMMENT ON TABLE sebo.kanal_konten IS
    'Auth-Token-Storage pro externem Channel. access_token/refresh_token sollten verschlüsselt gespeichert werden (Pattern wie iban_verschluesselt).';

-- 2. Leads ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sebo.leads (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    quelle              VARCHAR(30)  NOT NULL
                        CHECK (quelle IN (
                          'kontaktanfrage',
                          'instagram_dm','instagram_comment','instagram_mention',
                          'telegram',
                          'whatsapp',
                          'mail',
                          'manuell'
                        )),
    kanal_konto_id      INTEGER      REFERENCES sebo.kanal_konten(id) ON DELETE SET NULL,
    externe_id          VARCHAR(200),
    kontakt_handle      VARCHAR(200),
    kontakt_name        VARCHAR(200),
    kontakt_email       CITEXT,
    betreff             TEXT,
    vorschau            TEXT,
    customer_id         UUID         REFERENCES sebo.customers(id)        ON DELETE SET NULL,
    produkt_id          UUID         REFERENCES sebo.produkte(id)         ON DELETE SET NULL,
    kontaktanfrage_id   UUID         REFERENCES sebo.kontaktanfragen(id)  ON DELETE CASCADE,
    status              VARCHAR(20)  NOT NULL DEFAULT 'neu'
                        CHECK (status IN ('neu','gelesen','in_arbeit','beantwortet','qualifiziert','verloren','archiviert')),
    prioritaet          VARCHAR(10)  NOT NULL DEFAULT 'normal'
                        CHECK (prioritaet IN ('niedrig','normal','hoch','dringend')),
    zugewiesen_an       UUID         REFERENCES sebo.benutzer(id) ON DELETE SET NULL,
    tags                TEXT[]       NOT NULL DEFAULT '{}',
    raw_payload         JSONB,
    erstellt_am         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    aktualisiert_am     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    beantwortet_am      TIMESTAMPTZ,
    UNIQUE (quelle, externe_id)
);

CREATE INDEX IF NOT EXISTS idx_leads_status_offen
    ON sebo.leads(status) WHERE status NOT IN ('archiviert','verloren');
CREATE INDEX IF NOT EXISTS idx_leads_zugewiesen  ON sebo.leads(zugewiesen_an);
CREATE INDEX IF NOT EXISTS idx_leads_quelle      ON sebo.leads(quelle);
CREATE INDEX IF NOT EXISTS idx_leads_customer    ON sebo.leads(customer_id);
CREATE INDEX IF NOT EXISTS idx_leads_erstellt    ON sebo.leads(erstellt_am DESC);
CREATE INDEX IF NOT EXISTS idx_leads_kontakt_email ON sebo.leads(kontakt_email);

COMMENT ON TABLE sebo.leads IS
    'Universal-Inbox aller eingehenden Anfragen — Kontaktformular, Instagram (DM/Kommentar/Mention), Telegram, später WhatsApp/Mail.';
COMMENT ON COLUMN sebo.leads.externe_id IS
    'Idempotency-Key: Original-Message-ID des jeweiligen Channels. UNIQUE(quelle, externe_id) verhindert Duplikate beim Webhook-Replay.';
COMMENT ON COLUMN sebo.leads.raw_payload IS
    'Original-Webhook-Payload zur Replay/Debug. Niemals in UI exponieren (kann Tokens enthalten).';

-- 3. Lead-Messages (Konversation) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sebo.lead_messages (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id       UUID         NOT NULL REFERENCES sebo.leads(id) ON DELETE CASCADE,
    richtung      VARCHAR(10)  NOT NULL CHECK (richtung IN ('inbound','outbound','interne_notiz')),
    text          TEXT,
    attachments   JSONB        NOT NULL DEFAULT '[]',
    externe_id    VARCHAR(200),
    autor_id      UUID         REFERENCES sebo.benutzer(id) ON DELETE SET NULL,
    gesendet_am   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    gelesen_am    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lead_messages_lead ON sebo.lead_messages(lead_id, gesendet_am);

COMMENT ON COLUMN sebo.lead_messages.richtung IS
    'inbound = vom Kunden empfangen; outbound = von Admin gesendet; interne_notiz = nur intern sichtbar.';

-- 4. Trigger: Kontaktanfrage → Lead ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION sebo.fn_kontaktanfrage_to_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO sebo.leads (
    quelle, externe_id, kontaktanfrage_id,
    kontakt_name, kontakt_email,
    betreff, vorschau, produkt_id,
    status, raw_payload, erstellt_am
  )
  VALUES (
    'kontaktanfrage',
    NEW.id::text,                       -- externe_id = Kontaktanfrage-UUID als text
    NEW.id,
    NEW.name, NEW.email,
    NEW.betreff,
    LEFT(NEW.nachricht, 240),
    NEW.produkt_id,
    COALESCE(NEW.status, 'neu'),
    to_jsonb(NEW),
    COALESCE(NEW.erstellt_am, now())
  )
  ON CONFLICT (quelle, externe_id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_kontaktanfrage_to_lead ON sebo.kontaktanfragen;
CREATE TRIGGER trg_kontaktanfrage_to_lead
    AFTER INSERT ON sebo.kontaktanfragen
    FOR EACH ROW EXECUTE FUNCTION sebo.fn_kontaktanfrage_to_lead();

-- 5. Trigger: Status-Sync Lead ↔ Kontaktanfrage ─────────────────────────────
CREATE OR REPLACE FUNCTION sebo.fn_lead_sync_kontaktanfrage()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Wenn Lead aus einer Kontaktanfrage stammt, Status-Change spiegeln
  IF NEW.kontaktanfrage_id IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status THEN
    -- Mapping: lead-status → kontaktanfrage-status
    UPDATE sebo.kontaktanfragen
    SET status = CASE NEW.status
                   WHEN 'neu'         THEN 'neu'
                   WHEN 'gelesen'     THEN 'gelesen'
                   WHEN 'in_arbeit'   THEN 'gelesen'
                   WHEN 'beantwortet' THEN 'beantwortet'
                   WHEN 'qualifiziert' THEN 'beantwortet'
                   WHEN 'archiviert'  THEN 'archiviert'
                   ELSE COALESCE(status, 'neu')
                 END
    WHERE id = NEW.kontaktanfrage_id;
  END IF;

  -- aktualisiert_am bumpen
  NEW.aktualisiert_am := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_lead_update ON sebo.leads;
CREATE TRIGGER trg_lead_update
    BEFORE UPDATE ON sebo.leads
    FOR EACH ROW EXECUTE FUNCTION sebo.fn_lead_sync_kontaktanfrage();

-- 6. Backfill bestehender Kontaktanfragen ──────────────────────────────────
INSERT INTO sebo.leads (
  quelle, externe_id, kontaktanfrage_id,
  kontakt_name, kontakt_email,
  betreff, vorschau, produkt_id,
  status, raw_payload, erstellt_am
)
SELECT
  'kontaktanfrage',
  k.id::text,
  k.id,
  k.name, k.email,
  k.betreff,
  LEFT(k.nachricht, 240),
  k.produkt_id,
  COALESCE(k.status, 'neu'),
  to_jsonb(k),
  k.erstellt_am
FROM sebo.kontaktanfragen k
ON CONFLICT (quelle, externe_id) DO NOTHING;
