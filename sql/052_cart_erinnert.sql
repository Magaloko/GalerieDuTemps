-- ────────────────────────────────────────────────────────────────────────────
-- 052_cart_erinnert.sql — Warenkorb-Recovery: Erinnerungs-Stempel
--
-- Speichert, wann ein verlassener Server-Cart zuletzt per Telegram-Push
-- „erinnert" wurde. Idempotenz: ein Cart wird pro Abbruch nur EINMAL erinnert.
-- Sobald der Kunde den Cart wieder verändert, springt aktualisiert_am vor
-- erinnert_am → er wird nach erneutem Verfall wieder erinnerbar.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE sebo.carts
  ADD COLUMN IF NOT EXISTS erinnert_am TIMESTAMPTZ;

COMMENT ON COLUMN sebo.carts.erinnert_am IS
  'Zeitpunkt der letzten Warenkorb-Recovery-Erinnerung (Telegram). NULL = nie erinnert.';

-- =============================================================================
-- ENDE 052_cart_erinnert.sql
-- =============================================================================
