-- ────────────────────────────────────────────────────────────────────────────
-- 044_produkt_story_blocks.sql — Block-basierte „Story"-Beschreibung pro Produkt
--
-- Editoriale Produktseite (wie im Newsletter-Editor): die Detail-Beschreibung
-- wird aus sortierbaren Blöcken zusammengesetzt (Überschrift, Text, Bild,
-- Highlight, Zitat). Gespeichert als JSONB-Array.
--
-- Strukturierte Felder (name, preis, fotos, zustand, maße …) bleiben unberührt —
-- sie treiben Karten, Filter, SEO und Warenkorb. inhalt_blocks ist NUR der
-- erzählerische Detail-Inhalt. Leeres Array = Fallback auf Markdown-Beschreibung.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE sebo.produkte
  ADD COLUMN IF NOT EXISTS inhalt_blocks JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN sebo.produkte.inhalt_blocks IS
  'Story-Blöcke der Produktseite (JSONB-Array). Leer = Fallback auf beschreibung (Markdown).';

-- =============================================================================
-- ENDE 044_produkt_story_blocks.sql
-- =============================================================================
