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
