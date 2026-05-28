-- =============================================================================
-- 037_admin_telegram.sql — Telegram-Verknüpfung für Admins/Manager
-- =============================================================================
--
-- Bisher hatte nur sebo.customers Telegram-Spalten (Migration 026 + 036).
-- Damit aber Admins und Manager den Bot/Mini-App in ihrer Rolle nutzen
-- können (Inbox-Notifications, Order-Queue, Lead-Approval mobil), brauchen
-- wir das gleiche Set auch auf sebo.benutzer.
--
-- Identifikation in /api/telegram/auth (neuer Resolve-Reihenfolge):
--   1. benutzer WHERE telegram_chat_id = tg.user.id → role: admin/superadmin
--   2. customers WHERE telegram_chat_id = tg.user.id → role: customer
--   3. weder noch → role: guest (anonyme Mini-App)
--
-- Token-Spalte für Magic-Link-Claim (analog customers.telegram_link_token
-- aus Migration 026 — Web-User initiiert in /admin/profil, kopiert Token
-- in den Bot via /start <token> ODER kann später per claim-init Magic-Link).
-- =============================================================================

ALTER TABLE sebo.benutzer
  ADD COLUMN IF NOT EXISTS telegram_chat_id        BIGINT,
  ADD COLUMN IF NOT EXISTS telegram_username       VARCHAR(64),
  ADD COLUMN IF NOT EXISTS telegram_verknuepft_am  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS telegram_link_token     VARCHAR(64),
  ADD COLUMN IF NOT EXISTS telegram_notifications_aktiv BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_benutzer_telegram_chat_id
  ON sebo.benutzer(telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;

COMMENT ON COLUMN sebo.benutzer.telegram_chat_id IS
  'Telegram-Chat-ID des verknüpften Admin/Manager. NULL bis Admin selbst '
  'in /admin/profil → „Подключить Telegram" → /start <token> macht.';

-- =============================================================================
-- ENDE 037_admin_telegram.sql
-- =============================================================================
