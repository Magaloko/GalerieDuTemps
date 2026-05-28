-- =============================================================================
-- 038_checkout_token.sql — Checkout-Access-Token gegen IDOR
-- =============================================================================
--
-- Problem: die Zahlungs-Endpunkte (/api/checkout/stripe|bank-transfer|vor-ort)
-- akzeptierten nur eine order_id ohne Ownership-Prüfung. Wer eine pending-
-- Order-UUID kennt, könnte Payment-Methode setzen / Stripe-Session erzeugen.
--
-- Lösung: jede Order bekommt ein zufälliges checkout_token. Der Token wird
-- nur dem Besteller übergeben (in der Redirect-URL nach Cart-Submit) und von
-- den Zahlungs-Routen geprüft. UUIDs sind zwar nicht erratbar, aber der Token
-- ist Defense-in-Depth (URL-Leak via Referer/History/geteilte Links).
-- =============================================================================

ALTER TABLE sebo.orders
  ADD COLUMN IF NOT EXISTS checkout_token VARCHAR(64)
    DEFAULT encode(gen_random_bytes(24), 'hex');

-- Bestehende Orders ohne Token nachziehen
UPDATE sebo.orders
  SET checkout_token = encode(gen_random_bytes(24), 'hex')
  WHERE checkout_token IS NULL;

-- =============================================================================
-- ENDE 038_checkout_token.sql
-- =============================================================================
