-- ────────────────────────────────────────────────────────────────────────────
-- 046_reservierung_erinnert.sql — Ablauf-Erinnerung für Reservierungen
--
-- Der Cron (/api/cron/reservierungen-ablauf) soll den Kurator nur EINMAL pro
-- Reservierung erinnern, bevor die 48h-Frist abläuft. Dafür merken wir uns den
-- Zeitpunkt der Erinnerung. Beim Setzen einer (neuen) Reservierung wird das Feld
-- wieder auf NULL gesetzt (in produktReservieren), sodass die nächste Frist
-- erneut erinnert wird.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE sebo.produkte
  ADD COLUMN IF NOT EXISTS reservierung_erinnert_am TIMESTAMPTZ;

COMMENT ON COLUMN sebo.produkte.reservierung_erinnert_am IS
  'Zeitpunkt der letzten Ablauf-Erinnerung an den Kurator (NULL = noch nicht erinnert). Wird beim Setzen einer neuen Reservierung zurückgesetzt.';

-- =============================================================================
-- ENDE 046_reservierung_erinnert.sql
-- =============================================================================
