-- ────────────────────────────────────────────────────────────────────────────
-- 033_webhook_events.sql — Idempotenz-Ledger für externe Webhooks
--
-- Problem (siehe Codex-Audit HIGH-2):
-- Stripe/Kaspi/Telegram können dasselbe Event mehrfach zustellen (Retries
-- bei Network-Timeout, Multi-Worker-Race). Bisher basierte Idempotenz auf
-- order.status-Checks — das ist racy: zwei parallele Handler sehen den
-- alten Status, beide schreiben Status+Effects, doppelte E-Mails entstehen.
--
-- Lösung: Pro Provider + Event-ID einen Eintrag in dieser Tabelle.
-- UNIQUE-Constraint auf (provider, event_id) verhindert Doppel-Processing
-- atomar — INSERT ... ON CONFLICT DO NOTHING.
--
-- Wenn rowCount === 0 → war schon da → einfach 200 OK zurück, Effects nicht
-- erneut auslösen.
--
-- Event-ID-Konvention pro Provider:
--   stripe   → event.id (z.B. "evt_3PqRsTuVwXyZ")
--   kaspi    → ${event.type}:${event.data.payment_id} (Kaspi schickt keinen
--              eindeutigen event-Wrapper, Kombination payment_id+type ist
--              die natürliche Idempotenz-Achse)
--   telegram → "payment:${successful_payment.telegram_payment_charge_id}"
--              für payment-Updates. Andere Bot-Updates (Lead-Messages etc.)
--              brauchen keine Idempotenz weil sie nur logging machen.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sebo.webhook_events (
  provider      VARCHAR(40) NOT NULL,
  event_id      VARCHAR(200) NOT NULL,
  event_type    VARCHAR(80),
  order_id      UUID NULL REFERENCES sebo.orders(id) ON DELETE SET NULL,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_am  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_zeit
  ON sebo.webhook_events(processed_am DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_events_order
  ON sebo.webhook_events(order_id)
  WHERE order_id IS NOT NULL;

COMMENT ON TABLE sebo.webhook_events IS
  'Idempotenz-Ledger für externe Webhooks. Composite-PK (provider, event_id) verhindert Doppel-Processing atomar.';
COMMENT ON COLUMN sebo.webhook_events.event_id IS
  'Provider-spezifische Event-ID. Stripe: evt_*. Kaspi: type:payment_id. Telegram: payment:charge_id.';
