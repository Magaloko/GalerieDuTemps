-- ────────────────────────────────────────────────────────────────────────────
-- 053_tg_media_gruppen.sql — Claim-Ledger für Telegram-Media-Groups (Alben)
--
-- Sendet ein Admin mehrere Fotos als Album an den Bot, liefert Telegram N
-- separate Updates mit derselben media_group_id, die FAST GLEICHZEITIG
-- ankommen. Damit daraus EIN Produkt mit Galerie wird (statt N Entwürfe),
-- „claimt" der erste Webhook-Aufruf die Gruppe via INSERT ... ON CONFLICT
-- DO NOTHING (atomar, race-sicher). Der Gewinner legt das Produkt an und
-- schreibt produkt_id zurück; die übrigen Aufrufe warten kurz darauf und
-- hängen ihr Foto an die Galerie.
--
-- Kurzlebig: Zeilen sind nur für die ~Sekunden des Album-Eingangs relevant.
-- Ein optionaler GC kann alte Zeilen (> 1 Tag) löschen.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sebo.tg_media_gruppen (
  media_group_id TEXT PRIMARY KEY,
  produkt_id     UUID REFERENCES sebo.produkte(id) ON DELETE CASCADE,
  benutzer_id    UUID,
  erstellt_am    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tg_media_gruppen_zeit ON sebo.tg_media_gruppen (erstellt_am);

COMMENT ON TABLE sebo.tg_media_gruppen IS
  'Race-sicherer Claim-Ledger für Telegram-Album-Uploads: erste media_group_id-Insert gewinnt, legt das Produkt an, Rest hängt Fotos an.';

-- =============================================================================
-- ENDE 053_tg_media_gruppen.sql
-- =============================================================================
