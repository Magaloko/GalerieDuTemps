-- ---------------------------------------------------------------------------
-- Migration 021: Multilinguale Produkt-Texte (DE/EN/RU via JSONB)
--
-- Wir bewahren die bestehenden Spalten (name, kurzbeschreibung, beschreibung)
-- als "Default-Sprache" auf — neue JSONB-Spalten name_i18n/kurz_i18n/beschr_i18n
-- speichern die Übersetzungen pro Locale.
--
-- Lookup im Code: i18n.<locale> ?? default-Spalte. So bleibt Backwards-Compat
-- und keine Datenmigration nötig.
-- ---------------------------------------------------------------------------

ALTER TABLE sebo.produkte
    ADD COLUMN IF NOT EXISTS name_i18n             JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS kurzbeschreibung_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS beschreibung_i18n     JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN sebo.produkte.name_i18n IS
    'Übersetzungen pro Locale: {"de": "...", "en": "...", "ru": "..."}. Fallback auf name-Spalte wenn Key fehlt.';
COMMENT ON COLUMN sebo.produkte.kurzbeschreibung_i18n IS
    'Wie name_i18n — Fallback auf kurzbeschreibung-Spalte.';
COMMENT ON COLUMN sebo.produkte.beschreibung_i18n IS
    'Wie name_i18n — Fallback auf beschreibung-Spalte (Markdown).';

-- Backfill: bestehende Werte als ru kopieren (Hauptmarkt KZ)
UPDATE sebo.produkte
SET name_i18n = jsonb_build_object('ru', name)
WHERE name IS NOT NULL AND (name_i18n = '{}' OR name_i18n IS NULL);

UPDATE sebo.produkte
SET kurzbeschreibung_i18n = jsonb_build_object('ru', kurzbeschreibung)
WHERE kurzbeschreibung IS NOT NULL AND (kurzbeschreibung_i18n = '{}' OR kurzbeschreibung_i18n IS NULL);

UPDATE sebo.produkte
SET beschreibung_i18n = jsonb_build_object('ru', beschreibung)
WHERE beschreibung IS NOT NULL AND (beschreibung_i18n = '{}' OR beschreibung_i18n IS NULL);
