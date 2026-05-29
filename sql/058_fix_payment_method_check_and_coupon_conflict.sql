-- 058_fix_payment_method_check_and_coupon_conflict.sql
-- Behebt zwei latente Bugs, die die Geldpfad-Integrationstests (#63) aufgedeckt
-- haben. Beide greifen in Prod noch nicht, weil im Schaufenster-Modus (kaufen_
-- aktiv=false) bisher keine echten Zahlungen/Coupon-Einlösungen liefen.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 1) orders.payment_method-CHECK war zu eng.
--    Migration 010 legte (VOR 027) eine Constraint `orders_payment_method_check`
--    an: payment_method IN ('stripe','kaspi','sepa','manual'). Der idempotente
--    DO-Block in 027 sah die gleichnamige Constraint bereits existieren und
--    ÜBERSPRANG das Hinzufügen der vollen Methodenliste. Folge: moderne Methoden
--    (stripe_card, bank_transfer, vor_ort, vor_ort_anzahlung, paypal,
--    crypto_nowpayments, telegram_payments) verletzen die Constraint → der
--    Payment-UPDATE im Checkout schlägt fehl.
-- ─────────────────────────────────────────────────────────────────────────────

-- Legacy-Werte (aus 010) auf die neue Nomenklatur mappen, BEVOR die strengere
-- Constraint greift (ADD CONSTRAINT würde sonst an Bestandsdaten scheitern).
UPDATE sebo.orders SET payment_method = 'stripe_card' WHERE payment_method = 'stripe';
UPDATE sebo.orders SET payment_method = 'stripe_sepa' WHERE payment_method = 'sepa';
UPDATE sebo.orders SET payment_method = NULL          WHERE payment_method = 'manual';

-- Default 'stripe' (aus 010) entfernen — orderErstellen setzt payment_method
-- NICHT, neue Orders sollen NULL ("noch nicht entschieden") sein.
ALTER TABLE sebo.orders ALTER COLUMN payment_method DROP DEFAULT;

-- Enge Constraint durch die vollständige Methodenliste ersetzen.
ALTER TABLE sebo.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE sebo.orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN (
    'stripe_card',
    'stripe_sepa',
    'paypal',
    'crypto_nowpayments',
    'bank_transfer',
    'vor_ort',
    'vor_ort_anzahlung',
    'telegram_payments',
    'kaspi'
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) coupon_nutzungen: Unique-Index war PARTIAL (WHERE order_id IS NOT NULL).
--    order_id ist aber NOT NULL → das `ON CONFLICT (order_id)` in
--    couponNutzungVerbuchen findet keinen passenden Arbiter
--    ("no unique or exclusion constraint matching the ON CONFLICT specification").
--    Ersetzen durch einen vollen Unique-Index.
-- ─────────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS sebo.idx_coupon_nutzungen_order;
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_nutzungen_order
  ON sebo.coupon_nutzungen(order_id);
