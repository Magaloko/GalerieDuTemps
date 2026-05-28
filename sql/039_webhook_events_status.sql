-- =============================================================================
-- 039_webhook_events_status.sql — Zwei-Phasen-Idempotenz (processing/processed)
-- =============================================================================
--
-- Problem (Audit New #3 / #7-Partial): das Ledger markierte ein Event beim
-- Reserve sofort als „gesehen". Crasht der Handler DANACH (vor Status-Update/
-- Mail), wird der Provider-Retry als Duplikat mit 200 übersprungen → Side-
-- Effects laufen nie. Zahlung „verloren" obwohl Stripe es erneut schickt.
--
-- Lösung: Status-Spalte.
--   reserve  → INSERT status='processing' (oder reclaim wenn nicht 'processed')
--   Handler-Erfolg → markProcessed → status='processed'
--   Retry: nur status='processed' wird übersprungen; 'processing'/'failed'
--          darf erneut verarbeitet werden.
-- =============================================================================

ALTER TABLE sebo.webhook_events
  ADD COLUMN IF NOT EXISTS status         VARCHAR(20) NOT NULL DEFAULT 'processing',
  ADD COLUMN IF NOT EXISTS verarbeitet_am TIMESTAMPTZ;

-- Bestehende Events wurden vom alten Code unmittelbar verarbeitet → als
-- 'processed' markieren, damit ein künftiger Retry sie NICHT erneut anfasst.
UPDATE sebo.webhook_events
  SET status = 'processed', verarbeitet_am = COALESCE(verarbeitet_am, erstellt_am)
  WHERE status = 'processing';

-- =============================================================================
-- ENDE 039_webhook_events_status.sql
-- =============================================================================
