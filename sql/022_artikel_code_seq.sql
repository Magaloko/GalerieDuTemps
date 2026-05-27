-- ---------------------------------------------------------------------------
-- Migration 021: Auto-Generation für artikel_code via Sequence
--
-- Format: V-0001, V-0002, … (V = "Vintage" Präfix, 4 Stellen padded)
-- Wird in produktErstellen() automatisch gefüllt wenn nicht explizit gesetzt.
-- Admin kann Wert weiterhin manuell ändern (UI-Feld bleibt editierbar).
-- ---------------------------------------------------------------------------

-- Sequence (start = höchster existierender Code + 1, fallback 1)
DO $$
DECLARE
  start_val INT;
BEGIN
  SELECT COALESCE(MAX((regexp_match(artikel_code, 'V-(\d+)'))[1]::int), 0) + 1
    INTO start_val
    FROM sebo.produkte
    WHERE artikel_code ~ '^V-\d+$';

  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS sebo.artikel_code_seq START %s INCREMENT 1', start_val);
END $$;

-- Helper-Funktion liefert nächsten Code, IMMUTABLE-Sequence-Wrapper unnötig
CREATE OR REPLACE FUNCTION sebo.next_artikel_code()
RETURNS VARCHAR(20)
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'V-' || LPAD(nextval('sebo.artikel_code_seq')::text, 4, '0')
$$;

COMMENT ON FUNCTION sebo.next_artikel_code() IS
    'Liefert den nächsten fortlaufenden Artikel-Code im Format V-XXXX. Lücken bei Lösch- oder Rollback-Fällen sind by-design (Sequence garantiert Eindeutigkeit, nicht Lückenlosigkeit).';
