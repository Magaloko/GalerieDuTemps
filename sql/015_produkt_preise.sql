-- ---------------------------------------------------------------------------
-- Migration 015: einkaufspreis (internes Marge-Tracking) + b2b_preis (separater B2B-Preis)
-- Beide optional. b2b_preis wird in dieser Phase NUR erfasst, noch nicht im
-- Checkout angewendet — Checkout-Logik kommt in eigener Session.
-- ---------------------------------------------------------------------------

ALTER TABLE sebo.produkte
    ADD COLUMN IF NOT EXISTS einkaufspreis NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS b2b_preis     NUMERIC(10,2);

COMMENT ON COLUMN sebo.produkte.einkaufspreis IS
    'Interner Einkaufspreis (netto) für Margen-Berechnung. Niemals öffentlich.';
COMMENT ON COLUMN sebo.produkte.b2b_preis IS
    'Optionaler Preis für verifizierte B2B-Kunden. NULL = B2B sieht B2C-Preis.';
