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
-- ENDE 007_customer_b2b_invoices.sql
-- =============================================================================
