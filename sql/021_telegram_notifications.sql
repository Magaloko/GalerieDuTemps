-- ---------------------------------------------------------------------------
-- Migration 020: Telegram-Bot-Support + Notification-Throttle
--
-- Keine eigene Tabelle für Telegram nötig — wir bauen auf sebo.kanal_konten
-- aus 019 auf (kanal='telegram'). Diese Migration fügt nur:
--   1. Notification-Log-Tabelle für Throttle (max 1 Mail/15min/Admin/Channel)
--   2. Updated_am-Trigger auf kanal_konten für Audit-Zwecke
-- ---------------------------------------------------------------------------

-- 1. Notification-Log ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sebo.notification_log (
    id            BIGSERIAL    PRIMARY KEY,
    benutzer_id   UUID         NOT NULL REFERENCES sebo.benutzer(id) ON DELETE CASCADE,
    kanal         VARCHAR(20)  NOT NULL,   -- 'email' | 'web_push' | 'telegram'
    event_typ     VARCHAR(50)  NOT NULL,   -- 'new_lead' | 'order_paid' | 'task_assigned' | ...
    referenz_id   TEXT,                    -- z.B. lead.id, order.id
    gesendet_am   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_user_event
    ON sebo.notification_log(benutzer_id, event_typ, gesendet_am DESC);

COMMENT ON TABLE sebo.notification_log IS
    'Throttling für Admin-Notifications. Vor jedem Versand: Check ob letzte Sendung an diesen Admin für dieses Event >15min her ist.';

-- 2. Trigger: aktualisiert_am auf kanal_konten ─────────────────────────────
CREATE OR REPLACE FUNCTION sebo.fn_kanal_konten_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.aktualisiert_am := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_kanal_konten_touch ON sebo.kanal_konten;
CREATE TRIGGER trg_kanal_konten_touch
    BEFORE UPDATE ON sebo.kanal_konten
    FOR EACH ROW EXECUTE FUNCTION sebo.fn_kanal_konten_touch();
