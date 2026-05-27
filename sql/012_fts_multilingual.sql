-- ---------------------------------------------------------------------------
-- Migration 011: Volltextsuche auf multilingual ('simple') umstellen
-- Hintergrund: 'german' ignoriert kyrillische Tokens beim Stemming und liefert
-- für RU/EN-Suchanfragen keine Treffer. 'simple' funktioniert sprach-agnostisch
-- für RU, EN, DE und KZ — ohne Stemming, dafür universell.
-- ---------------------------------------------------------------------------

DROP INDEX IF EXISTS sebo.idx_produkte_fts;

CREATE INDEX idx_produkte_fts ON sebo.produkte
    USING GIN(to_tsvector('simple',
        coalesce(name, '') || ' ' ||
        coalesce(kurzbeschreibung, '') || ' ' ||
        coalesce(beschreibung, '') || ' ' ||
        coalesce(era, '') || ' ' ||
        coalesce(material, '') || ' ' ||
        coalesce(herkunft, '')
    ));
