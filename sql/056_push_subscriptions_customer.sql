-- 056_push_subscriptions_customer.sql
-- Erweitert die Operator-Push-Infra (Migration 055) auf KUNDEN.
--
-- Bisher war push_subscriptions an einen Admin/Operator (benutzer_id → benutzer)
-- gebunden. Kunden sollen sich nun ebenfalls für „Neuheiten/Rabatte" anmelden
-- können — entweder eingeloggt (customer_id → customers) oder als anonymer Gast
-- (beide Spalten NULL, nur audience='customer').
--
--   audience = 'operator'  → Admin-Alerts (Bestellung/Lead), benutzer_id gesetzt
--   audience = 'customer'  → Shop-Besucher (Neuheiten), customer_id ODER NULL
--
-- benutzer_id muss daher nullable sein (in 055 ohne NOT NULL angelegt — der
-- DROP NOT NULL unten ist defensiv idempotent, falls eine Umgebung abweicht).

ALTER TABLE sebo.push_subscriptions
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES sebo.customers(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS audience    TEXT NOT NULL DEFAULT 'operator';

ALTER TABLE sebo.push_subscriptions
  ALTER COLUMN benutzer_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_push_subs_audience ON sebo.push_subscriptions(audience);
CREATE INDEX IF NOT EXISTS idx_push_subs_customer ON sebo.push_subscriptions(customer_id);
