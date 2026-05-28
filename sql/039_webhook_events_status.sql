-- =============================================================================
-- 039_webhook_events_status.sql — Zwei-Phasen-Idempotenz + Coupon-Idempotenz
-- =============================================================================
--
-- Problem (Audit New #3 / #7-Partial): das Ledger markierte ein Event beim
-- Reserve sofort als „gesehen". Crasht der Handler DANACH, wird der Provider-
-- Retry als Duplikat übersprungen → Side-Effects laufen nie.
--
-- Lösung: Status-Spalte. reserve → 'processing', Handler-Erfolg → 'processed'.
-- Retry: nur 'processed' wird übersprungen.
--
-- HINWEIS: sebo.webhook_events (Migration 033) hat bereits `processed_am`
-- (NOT NULL DEFAULT now()) — wir nutzen DAS, KEINE neue Timestamp-Spalte.
-- =============================================================================

ALTER TABLE sebo.webhook_events
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'processing';

-- Bestehende Events wurden vom alten Code unmittelbar verarbeitet → 'processed',
-- damit ein künftiger Retry sie NICHT erneut anfasst.
UPDATE sebo.webhook_events
  SET status = 'processed'
  WHERE status = 'processing';

-- ---------------------------------------------------------------------------
-- Coupon-Idempotenz: ein Coupon darf pro Order nur EINMAL verbucht werden.
-- Verhindert Doppel-Zähler bei Webhook-Retry / Parallel-Retry.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_nutzungen_order
  ON sebo.coupon_nutzungen(order_id)
  WHERE order_id IS NOT NULL;

-- =============================================================================
-- ENDE 039_webhook_events_status.sql
-- =============================================================================
