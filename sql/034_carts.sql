-- =============================================================================
-- 034_carts.sql — Server-side Cart für linked Customers
-- =============================================================================
--
-- Bisher war der Cart eine reine localStorage-Sache. Das funktioniert für
-- anonyme User, aber sobald ein User einen Account hat und zwischen Web und
-- Telegram-Mini-App wechselt, sind die localStorage-Carts isoliert
-- (verschiedene Browser-Cookie-Jars).
--
-- Diese Tabelle hält pro Customer einen Server-Cart. Web- und Mini-App-
-- Clients synchronisieren ihren localStorage-State asynchron mit dem
-- Server-State (read-on-mount, write-debounced).
--
-- Anonyme User bleiben weiter auf localStorage. Beim Login wird der lokale
-- Cart auf den Server gepusht (merge oder replace, je nach Policy).
-- =============================================================================

CREATE TABLE IF NOT EXISTS sebo.carts (
    customer_id  UUID         PRIMARY KEY REFERENCES sebo.customers(id) ON DELETE CASCADE,
    /* items als JSONB-Array. Schema entspricht CartItem aus types/commerce.ts:
         [{
            produkt_id, slug, name, bild_url, einzelpreis_cents,
            menge, tax_rate, tax_exempt, ist_seminar, max_menge
          }, ...]
       Wir denormalisieren absichtlich Produkt-Snapshots (Name, Bild, Preis),
       damit ein Cart-Reload nicht N+1 Queries macht. Aktualität wird beim
       Checkout durch Re-Validate gegen sebo.produkte geprüft. */
    items        JSONB        NOT NULL DEFAULT '[]',
    coupon_code  VARCHAR(50),
    aktualisiert_am TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_carts_aktualisiert ON sebo.carts(aktualisiert_am);

-- Auto-Update aktualisiert_am bei Änderung
DROP TRIGGER IF EXISTS trg_carts_touch ON sebo.carts;
CREATE TRIGGER trg_carts_touch
    BEFORE UPDATE ON sebo.carts
    FOR EACH ROW EXECUTE FUNCTION sebo.update_aktualisiert_am();

-- =============================================================================
-- ENDE 034_carts.sql
-- =============================================================================
