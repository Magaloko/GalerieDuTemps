-- ---------------------------------------------------------------------------
-- Migration 017: Produkt-Dateien (PDFs/Downloads) + Zertifikate (Trust-Signale)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sebo.produkt_dateien (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    produkt_id    UUID         NOT NULL REFERENCES sebo.produkte(id) ON DELETE CASCADE,
    url           VARCHAR(500) NOT NULL,
    name          VARCHAR(200) NOT NULL,
    dateigroesse  INTEGER,
    sortierung    SMALLINT     NOT NULL DEFAULT 0,
    erstellt_am   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_produkt_dateien_produkt
    ON sebo.produkt_dateien(produkt_id, sortierung);

COMMENT ON TABLE sebo.produkt_dateien IS
    'PDFs / Datenblätter / Anleitungen — werden auf Produktseite als Download-Button angezeigt.';

CREATE TABLE IF NOT EXISTS sebo.produkt_zertifikate (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    produkt_id    UUID         NOT NULL REFERENCES sebo.produkte(id) ON DELETE CASCADE,
    url           VARCHAR(500) NOT NULL,
    name          VARCHAR(200) NOT NULL,
    aussteller    VARCHAR(200),
    datum         DATE,
    sortierung    SMALLINT     NOT NULL DEFAULT 0,
    erstellt_am   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_produkt_zertifikate_produkt
    ON sebo.produkt_zertifikate(produkt_id, sortierung);

COMMENT ON TABLE sebo.produkt_zertifikate IS
    'Echtheits-/Qualitäts-Zertifikate als Trust-Signale auf der Produktseite (Bild oder PDF).';
