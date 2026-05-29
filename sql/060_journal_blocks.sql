-- =============================================================================
-- vintage-market · 060: Journal-Beiträge als Block-Builder (analog Landing-Pages)
--
-- Journal-Posts bekommen eine `blocks`-Spalte (JSONB-Array von LandingBlock),
-- damit sie mit demselben Block-Editor wie die Landing-Pages bearbeitet werden
-- können. Die bestehende `markdown`-Spalte bleibt erhalten: Bestandsposts ohne
-- Blocks rendern weiter über markdownToHtml (Abwärtskompatibilität + Fallback).
--
-- Idempotent (ADD COLUMN IF NOT EXISTS) — kann gefahrlos mehrfach laufen.
-- =============================================================================

ALTER TABLE sebo.journal_posts
    ADD COLUMN IF NOT EXISTS blocks JSONB NOT NULL DEFAULT '[]'::jsonb;

-- =============================================================================
-- ENDE 060_journal_blocks.sql
-- =============================================================================
