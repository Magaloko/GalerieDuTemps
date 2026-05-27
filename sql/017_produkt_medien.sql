-- ---------------------------------------------------------------------------
-- Migration 016: produkte um direkte Medien-URLs erweitern
-- - hauptbild_url: schnellster Pfad ohne Galerie-Verwaltung
-- - rueckbild_url: zweites Bild (Rückseite, Detail, …) inline pflegbar
-- - video_url:     MP4 oder YouTube/Vimeo-URL
-- Die bestehende sebo.produktbilder-Tabelle bleibt für zusätzliche Galerie-Bilder.
-- ---------------------------------------------------------------------------

ALTER TABLE sebo.produkte
    ADD COLUMN IF NOT EXISTS hauptbild_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS rueckbild_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS video_url     VARCHAR(500);

COMMENT ON COLUMN sebo.produkte.hauptbild_url IS
    'Direkte Haupt-Bild-URL (Schnellpfad). Hat Vorrang vor produktbilder.ist_hauptbild.';
COMMENT ON COLUMN sebo.produkte.rueckbild_url IS
    'Optionales zweites Bild — Rückseite, Detail, alternative Ansicht.';
COMMENT ON COLUMN sebo.produkte.video_url IS
    'MP4-URL oder YouTube/Vimeo-Embed-URL. Wird auf Detail-Seite eingebunden.';
