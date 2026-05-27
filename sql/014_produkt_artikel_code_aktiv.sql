-- ---------------------------------------------------------------------------
-- Migration 013: produkte um artikel_code (SKU) + aktiv (Sichtbarkeits-Master) erweitern
-- ---------------------------------------------------------------------------

ALTER TABLE sebo.produkte
    ADD COLUMN IF NOT EXISTS artikel_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS aktiv BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_produkte_artikel_code
    ON sebo.produkte(artikel_code)
    WHERE artikel_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_produkte_aktiv
    ON sebo.produkte(aktiv) WHERE aktiv = true;

COMMENT ON COLUMN sebo.produkte.artikel_code IS
    'Optionaler Artikel-/SKU-Code (z.B. V-001, A123). Eindeutig wenn gesetzt.';
COMMENT ON COLUMN sebo.produkte.aktiv IS
    'Master-Switch für Sichtbarkeit. false = überall ausgeblendet, unabhängig von b2c_mode/lagerbestand/verkauft.';
