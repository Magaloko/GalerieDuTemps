-- ---------------------------------------------------------------------------
-- Migration 018: FTS-Index um Material, Herkunft, Tags, Kurzbeschreibung, Artikel-Code
-- Hinweis: array_to_string() ist STABLE, nicht IMMUTABLE → kann nicht im
-- Functional-Index verwendet werden. Stattdessen Cast tags::text — gibt
-- `{tag1,"tag mit spaces",tag3}` zurück. Für FTS-'simple' tokenisiert das
-- sauber an non-alphanumerischen Zeichen.
-- ---------------------------------------------------------------------------

DROP INDEX IF EXISTS sebo.idx_produkte_fts;

CREATE INDEX idx_produkte_fts ON sebo.produkte
    USING GIN(to_tsvector('simple',
        coalesce(name, '') || ' ' ||
        coalesce(kurzbeschreibung, '') || ' ' ||
        coalesce(beschreibung, '') || ' ' ||
        coalesce(era, '') || ' ' ||
        coalesce(material, '') || ' ' ||
        coalesce(herkunft, '') || ' ' ||
        coalesce(artikel_code, '') || ' ' ||
        coalesce(tags::text, '')
    ));
