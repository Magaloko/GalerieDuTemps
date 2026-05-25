-- ---------------------------------------------------------------------------
-- Migration 018: FTS-Index um Material, Herkunft, Tags, Kurzbeschreibung, Artikel-Code
-- Vorher: name + kurzbeschreibung + beschreibung + era + material (war partial)
-- Jetzt:  name + kurzbeschreibung + beschreibung + era + material + herkunft +
--         artikel_code + tags (als Array → array_to_string)
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
        coalesce(array_to_string(tags, ' '), '')
    ));
