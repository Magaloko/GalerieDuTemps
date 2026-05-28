-- ────────────────────────────────────────────────────────────────────────────
-- 042_produkt_reservierung.sql — Manuelle Reservierung von Einzelstücken
--
-- Inquiry-first-Kern: ein Kurator kann ein Stück für einen Interessenten
-- befristet reservieren (Default 48h). Während der Reservierung erscheint das
-- Stück als „Зарезервировано" (binär, ohne Detail-Leak) und ist nicht kaufbar.
--
-- Bewusst KEIN eigener Status-Enum: abgeleitet aus
--   verkauft = true                              → „Продано"
--   reserviert_bis > now() AND NOT verkauft      → „Зарезервировано"
--   sonst (lagerbestand > 0)                     → „В наличии"
-- Läuft die Frist ab, ist das Stück automatisch wieder verfügbar (lazy, kein Cron).
--
-- reserviert_von: freier Admin-Kontext (Lead-Handle / Name / E-Mail) — NUR im
-- Admin sichtbar, NIE in öffentlichen Responses.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE sebo.produkte
  ADD COLUMN IF NOT EXISTS reserviert_bis TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reserviert_von TEXT;

-- Schneller Lookup aktiver Reservierungen (Admin-Übersicht / Aufräum-Jobs).
CREATE INDEX IF NOT EXISTS idx_produkte_reserviert_bis
  ON sebo.produkte (reserviert_bis)
  WHERE reserviert_bis IS NOT NULL;

COMMENT ON COLUMN sebo.produkte.reserviert_bis IS
  'Reservierung gültig bis (NULL = nicht reserviert). Abgelaufen = wieder verfügbar.';
COMMENT ON COLUMN sebo.produkte.reserviert_von IS
  'Admin-Kontext: für wen reserviert (Lead/Name/E-Mail). Niemals öffentlich.';

-- =============================================================================
-- ENDE 042_produkt_reservierung.sql
-- =============================================================================
