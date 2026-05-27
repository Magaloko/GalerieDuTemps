-- =============================================================================
-- vintage-market · Phase 11 (Nachzügler) — Affiliate kaspi_telefon
-- Wird benötigt, weil Auszahlungs-Methode 'kaspi' eine eigene Nummer braucht
-- (nicht zwangsläufig identisch mit der Kontakt-Nummer)
-- =============================================================================

ALTER TABLE sebo.affiliates
    ADD COLUMN IF NOT EXISTS kaspi_telefon VARCHAR(20);

-- Comment für DB-Doku
COMMENT ON COLUMN sebo.affiliates.kaspi_telefon IS
    'Kaspi.kz-Telefonnummer für Auszahlung (E.164 ohne führendes "+", z.B. 77011234567)';

-- =============================================================================
-- ENDE 011_affiliate_kaspi.sql
-- =============================================================================
