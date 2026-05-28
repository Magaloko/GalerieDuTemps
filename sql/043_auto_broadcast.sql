-- ────────────────────────────────────────────────────────────────────────────
-- 043_auto_broadcast.sql — Auto-Broadcast neuer Stücke in den Telegram-Kanal
--
-- Zwei Bausteine:
--  1. Spalte produkte.kanal_gepostet_am — Idempotenz-Stempel. Gesetzt sobald ein
--     Stück (automatisch oder manuell) in den Kanal gepostet wurde. Verhindert
--     Doppel-Posts beim erneuten Publish/Toggle.
--  2. Feature-Flag auto_broadcast_neu — Master-Schalter (Default FALSE, da ein
--     Broadcast ein sichtbarer Seiteneffekt ist und nie versehentlich feuern darf).
--
-- Beim Veröffentlichen (aktiv → true) postet das System das Stück genau einmal in
-- den Kanal, wenn der Schalter an ist, ein Bild vorhanden und noch nicht gepostet.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE sebo.produkte
  ADD COLUMN IF NOT EXISTS kanal_gepostet_am TIMESTAMPTZ;

COMMENT ON COLUMN sebo.produkte.kanal_gepostet_am IS
  'Wann das Stück in den Telegram-Kanal gepostet wurde (NULL = noch nie). Idempotenz.';

INSERT INTO sebo.feature_flags (schluessel, aktiviert, beschreibung)
VALUES ('auto_broadcast_neu', false,
        'Авто-публикация новинок в Telegram-канал при выставлении товара активным.')
ON CONFLICT (schluessel) DO NOTHING;

-- =============================================================================
-- ENDE 043_auto_broadcast.sql
-- =============================================================================
