-- ---------------------------------------------------------------------------
-- Migration 014: kategorien um code-Spalte (optionaler Display-Code wie „01")
-- ---------------------------------------------------------------------------

ALTER TABLE sebo.kategorien
    ADD COLUMN IF NOT EXISTS code VARCHAR(10);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kategorien_code
    ON sebo.kategorien(code) WHERE code IS NOT NULL;

COMMENT ON COLUMN sebo.kategorien.code IS
    'Optionaler kurzer Display-Code (z.B. „01", „02A"). Eindeutig wenn gesetzt.';
