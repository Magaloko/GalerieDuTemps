-- ---------------------------------------------------------------------------
-- Migration 018: FTS-Index um Material, Herkunft, Artikel-Code, Kurzbeschreibung
-- Tags werden via IMMUTABLE-Wrapper-Funktion eingebunden, da array_to_string()
-- und text[]::text in manchen PG-Konfigurationen als STABLE/VOLATILE behandelt
-- werden und nicht direkt in Functional-Indexen erlaubt sind.
-- ---------------------------------------------------------------------------

-- IMMUTABLE-Helper: Tags → space-separated string für FTS
CREATE OR REPLACE FUNCTION sebo.fts_tags(tags text[])
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT coalesce(array_to_string(tags, ' '), '')
$$;

DROP INDEX IF EXISTS sebo.idx_produkte_fts;

CREATE INDEX idx_produkte_fts ON sebo.produkte
    USING GIN(to_tsvector('simple'::regconfig,
        coalesce(name, '') || ' ' ||
        coalesce(kurzbeschreibung, '') || ' ' ||
        coalesce(beschreibung, '') || ' ' ||
        coalesce(era, '') || ' ' ||
        coalesce(material, '') || ' ' ||
        coalesce(herkunft, '') || ' ' ||
        coalesce(artikel_code, '') || ' ' ||
        sebo.fts_tags(tags)
    ));
