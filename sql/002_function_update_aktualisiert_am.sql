-- =============================================================================
-- Migration 002 · sebo.update_aktualisiert_am() Trigger-Funktion
-- =============================================================================
-- Hintergrund: Migrations 003 / 005 / 007 / 008 referenzieren diese Funktion
-- in Trigger-Definitionen. Sie wurde aber NIE über eine reguläre Migration
-- erstellt — Production lief, weil _supabase_combined.sql sie manuell in
-- Supabase angelegt hat.
--
-- 001 hat eine ähnliche Funktion `sebo.set_aktualisiert_am()` (anderer
-- Prefix). Wir behalten beide für Backwards-Compat — manche Trigger sind
-- bereits an `set_` gebunden.
--
-- Effekt für frische Test-DB (CI / Docker):
--   ohne diese Datei → Migration 003 wirft "function does not exist"
--   mit dieser Datei → alle Triggers binden korrekt
-- =============================================================================

CREATE OR REPLACE FUNCTION sebo.update_aktualisiert_am()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.aktualisiert_am = now();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION sebo.update_aktualisiert_am IS
    'Auto-Update-Trigger: setzt aktualisiert_am = now() bei UPDATE. '
    'Identisch mit sebo.set_aktualisiert_am — beide existieren historisch.';
