-- ────────────────────────────────────────────────────────────────────────────
-- 027_payment_methods.sql — Multi-Provider-Payment + Anzahlung
--
-- Erweitert sebo.orders um payment_method + payment_status + payment_meta,
-- damit Bestellungen auch via PayPal, Crypto, Bank-Transfer oder vor-Ort
-- (mit oder ohne Anzahlung) verarbeitet werden können — nicht nur Stripe.
--
-- payment_method   — welche Methode hat der Customer gewählt
-- payment_status   — separater Status nur für Zahlung (unpaid/partial/paid/…)
--                    UNABHÄNGIG vom order.status, weil eine Bestellung
--                    'pending' Order-Status haben kann während payment_status
--                    bereits 'partial' (Anzahlung empfangen) ist.
-- payment_meta     — provider-spezifische Felder (PayPal-Order-ID,
--                    Crypto-Adresse, Bank-Reference, etc.) als JSONB.
-- anzahlung_cents  — Wenn > 0: nur dieser Betrag muss online bezahlt werden,
--                    der Rest (total - anzahlung) wird vor Ort kassiert.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE sebo.orders
  ADD COLUMN IF NOT EXISTS payment_method  VARCHAR(40),
  ADD COLUMN IF NOT EXISTS payment_status  VARCHAR(20) NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_meta    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS anzahlung_cents INTEGER,
  ADD COLUMN IF NOT EXISTS anzahlung_bezahlt_am TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(60);

-- Existing CHECK constraint (status IN …) bleibt für status-Spalte. Wir
-- fügen einen separaten Check für payment_status hinzu (idempotent via DO):
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_status_check'
  ) THEN
    ALTER TABLE sebo.orders
      ADD CONSTRAINT orders_payment_status_check
      CHECK (payment_status IN ('unpaid','pending','partial','paid','refunded','failed'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_method_check'
  ) THEN
    ALTER TABLE sebo.orders
      ADD CONSTRAINT orders_payment_method_check
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
  END IF;
END $$;

-- Reverse-Lookup nach Reference (Admin sucht nach Banküberweisungs-Code)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_reference
  ON sebo.orders(payment_reference)
  WHERE payment_reference IS NOT NULL;

-- Index für offene Zahlungen (Admin-Inbox)
CREATE INDEX IF NOT EXISTS idx_orders_payment_status_open
  ON sebo.orders(payment_status)
  WHERE payment_status IN ('unpaid','pending','partial');

COMMENT ON COLUMN sebo.orders.payment_method IS
  'Vom Customer gewählte Zahlungsart. NULL = noch nicht entschieden (Order in Cart).';
COMMENT ON COLUMN sebo.orders.payment_status IS
  'Separat von status: kann ''partial'' sein während order.status noch ''pending''.';
COMMENT ON COLUMN sebo.orders.payment_meta IS
  'Provider-spezifische Daten (paypal_order_id, crypto_address, bank_reference, …).';
COMMENT ON COLUMN sebo.orders.anzahlung_cents IS
  'Wenn gesetzt: dieser Betrag online, Restbetrag bei Abholung. Total = total_cents.';

-- ────────────────────────────────────────────────────────────────────────────
-- Seed: Bank-Daten + Vor-Ort-Anweisungen als editierbare Marketing-Strings
-- (siehe sql/025_marketing_strings.sql). Auch wenn Tabelle leer — User kann
-- nach Migration die echten Werte im Admin → Marketing-Texte eintragen.
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO sebo.marketing_strings (schluessel, wert_i18n, beschreibung, fallback) VALUES

('payment.bank.kontoinhaber',
 '{"ru":"Galerie du Temps KZ","en":"Galerie du Temps KZ","de":"Galerie du Temps KZ"}'::jsonb,
 'Bank-Überweisung: Kontoinhaber-Name', 'Galerie du Temps KZ'),

('payment.bank.bank_name',
 '{"ru":"Halyk Bank Kazakhstan","en":"Halyk Bank Kazakhstan","de":"Halyk Bank Kazakhstan"}'::jsonb,
 'Bank-Überweisung: Bank-Name', 'Halyk Bank'),

('payment.bank.iban',
 '{"ru":"KZ00 0000 0000 0000 0000","en":"KZ00 0000 0000 0000 0000","de":"KZ00 0000 0000 0000 0000"}'::jsonb,
 'Bank-Überweisung: IBAN / Konto-Nummer', 'KZ00 0000 0000 0000 0000'),

('payment.bank.bic',
 '{"ru":"HSBKKZKX","en":"HSBKKZKX","de":"HSBKKZKX"}'::jsonb,
 'Bank-Überweisung: BIC / SWIFT', 'HSBKKZKX'),

('payment.bank.zusatz',
 '{"ru":"Указать в назначении платежа: {ref}","en":"Reference in transfer: {ref}","de":"Verwendungszweck: {ref}"}'::jsonb,
 'Hinweis-Text wie Reference anzugeben. {ref} wird durch Bestellungs-Reference ersetzt.',
 'Указать в назначении платежа: {ref}'),

('payment.vor_ort.adresse',
 '{"ru":"ул. Достык 89, БЦ Тенгиз · Алматы","en":"Dostyk str. 89, Tengiz BC · Almaty","de":"Dostyk str. 89, Tengiz BC · Almaty"}'::jsonb,
 'Vor-Ort-Bezahlung: Adresse der Galerie', 'Алматы'),

('payment.vor_ort.oeffnungszeiten',
 '{"ru":"Пн–Пт 10:00–18:00 · Сб 11:00–16:00","en":"Mon–Fri 10:00–18:00 · Sat 11:00–16:00","de":"Mo–Fr 10:00–18:00 · Sa 11:00–16:00"}'::jsonb,
 'Vor-Ort-Bezahlung: Öffnungszeiten', 'Mo–Fr 10:00–18:00'),

('payment.anzahlung.prozent_default',
 '{"ru":"30","en":"30","de":"30"}'::jsonb,
 'Vor-Ort + Anzahlung: Default-Prozentsatz für Online-Anzahlung (Rest bei Abholung)',
 '30')

ON CONFLICT (schluessel) DO NOTHING;
