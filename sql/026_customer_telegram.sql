-- ────────────────────────────────────────────────────────────────────────────
-- 026_customer_telegram.sql — Customer ↔ Telegram-Verknüpfung
--
-- Phase B1 der Telegram-Integration (siehe ROADMAP-TELEGRAM.md). Erlaubt
-- Customers ihren Telegram-Account zu verbinden um Bestell-Notifications
-- per DM statt nur per E-Mail zu bekommen.
--
-- Verknüpfungs-Flow:
--   1. Customer in /kunde/profil klickt „Telegram verknüpfen"
--   2. Server generiert OTP-Token, speichert in telegram_link_token
--   3. UI zeigt Deep-Link: tg://resolve?domain=<bot>&start=<token>
--   4. Customer öffnet Link → Telegram → /start <token> an Bot
--   5. Webhook validiert Token → setzt telegram_chat_id, löscht Token
--   6. Ab jetzt: sendMessage(chat_id, ...) für Bestell-Events
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE sebo.customers
  ADD COLUMN IF NOT EXISTS telegram_chat_id       BIGINT,
  ADD COLUMN IF NOT EXISTS telegram_username      VARCHAR(64),
  ADD COLUMN IF NOT EXISTS telegram_link_token    VARCHAR(64),
  ADD COLUMN IF NOT EXISTS telegram_verknuepft_am TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS telegram_notifications_aktiv BOOLEAN NOT NULL DEFAULT true;

-- chat_id ist global eindeutig (ein Telegram-User = ein Customer)
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_telegram_chat_id
  ON sebo.customers(telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;

-- token muss zur Verifizierungs-Lookup eindeutig sein
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_telegram_link_token
  ON sebo.customers(telegram_link_token)
  WHERE telegram_link_token IS NOT NULL;

COMMENT ON COLUMN sebo.customers.telegram_chat_id IS
  'Telegram-User-ID (chat_id für private Chats). NULL = nicht verknüpft.';
COMMENT ON COLUMN sebo.customers.telegram_link_token IS
  'OTP-Token für /start-Command. Wird beim erfolgreichen Verknüpfen gelöscht.';
COMMENT ON COLUMN sebo.customers.telegram_notifications_aktiv IS
  'Master-Toggle für Telegram-Notifications (Bestellung, Versand, etc.).';
