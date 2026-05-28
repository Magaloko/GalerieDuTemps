-- ────────────────────────────────────────────────────────────────────────────
-- 050_email_optional.sql — Telegram-first-Accounts ohne E-Mail
--
-- Damit über Telegram kommende Nutzer per 1-Tap ein Konto bekommen können, das
-- NUR an ihre telegram_chat_id gekoppelt ist (E-Mail optional, später ergänzbar).
--
-- Postgres-UNIQUE behandelt NULLs als distinct → mehrere E-Mail-lose Konten sind
-- erlaubt, während gesetzte E-Mails weiterhin eindeutig bleiben. Es genügt also,
-- NOT NULL zu droppen; die bestehende UNIQUE-Constraint bleibt unverändert.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE sebo.customers ALTER COLUMN email DROP NOT NULL;

COMMENT ON COLUMN sebo.customers.email IS
  'Optional: NULL bei Telegram-first-Accounts (Identität = telegram_chat_id). Eindeutig wenn gesetzt.';

-- =============================================================================
-- ENDE 050_email_optional.sql
-- =============================================================================
