-- =============================================================================
-- 036_telegram_claim.sql — Reverse-Direction Telegram-Link-Flow
-- =============================================================================
--
-- Bestehender Flow (vor 036):
--   Web-User → /kunde/profil → klickt „Подключить Telegram"
--   → customers.telegram_link_token gesetzt
--   → User öffnet /start <token> im Bot
--   → telegram_chat_id wird gesetzt
--
-- Neuer Flow (036) — Reverse-Direction für Mini-App-First-User:
--   Telegram-User öffnet Mini-App → /tg/profil
--   → gibt seine E-Mail ein → /api/telegram/claim-init
--   → Server speichert claim_chat_id + claim_token am Email-Customer
--   → E-Mail mit Magic-Link an die E-Mail-Adresse
--   → User klickt → /kunde/telegram-claim?token=...
--   → Server bestätigt: telegram_chat_id wird vom claim-Feld kopiert
--
-- Warum separate Claim-Spalten (statt direkt telegram_chat_id):
--   Bevor der Mail-Empfänger den Link klickt, ist die Verknüpfung NICHT
--   bestätigt. Wir wollen keinen Telegram-Account an einen E-Mail-Account
--   binden bevor die E-Mail-Adresse als „zugänglich" verifiziert wurde —
--   sonst könnte jemand mit fremder Telegram-ID einen Account beanspruchen.
--
-- TTL: 15 Minuten (claim_expires_at). Kurzes Fenster reduziert
-- Spam-Vektor + Race-Risiken (User loggt sich aus, klickt Link, etc.).
-- =============================================================================

ALTER TABLE sebo.customers
  ADD COLUMN IF NOT EXISTS telegram_claim_token       VARCHAR(64),
  ADD COLUMN IF NOT EXISTS telegram_claim_chat_id     BIGINT,
  ADD COLUMN IF NOT EXISTS telegram_claim_username    VARCHAR(64),
  ADD COLUMN IF NOT EXISTS telegram_claim_expires_at  TIMESTAMPTZ;

-- Index für Token-Lookup (häufiger Pfad: /kunde/telegram-claim?token=...)
CREATE INDEX IF NOT EXISTS idx_customers_telegram_claim_token
  ON sebo.customers(telegram_claim_token)
  WHERE telegram_claim_token IS NOT NULL;

COMMENT ON COLUMN sebo.customers.telegram_claim_token IS
  'Magic-Link-Token für Telegram-Verknüpfung initiiert AUS dem Mini-App. '
  'Auto-cleared nach Confirm oder Expiry.';

-- =============================================================================
-- ENDE 036_telegram_claim.sql
-- =============================================================================
