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
-- ENDE 006_ecommerce.sql
-- =============================================================================
