-- 057_perf_indexes_and_constraints.sql
-- Performance- & Konsistenz-Pass aus dem Senior-Dev-Audit.
--
-- Hinweis: KEIN CREATE INDEX CONCURRENTLY — der Migrations-Runner
-- (scripts/db-migrate.mjs) fährt jede Datei in einer Transaktion, und
-- CONCURRENTLY ist dort nicht erlaubt. Bei der aktuellen Datengröße ist der
-- kurzzeitige Lock vernachlässigbar. Alles idempotent (IF [NOT] EXISTS).

-- ──────────────────────────────────────────────────────────────────────────
-- 1) FTS-Index reparieren (SEV-2.A)
--    Der bisherige GIN-Index-Ausdruck wich vom Query-Ausdruck in
--    produkte-public.ts ab (es fehlten `herkunft` + `artikel_code`).
--    Stimmt der Index-Ausdruck nicht EXAKT mit der Query überein, ignoriert
--    Postgres ihn → jede Katalog-Suche = Seq-Scan. Hier neu erstellt mit
--    identischer Spaltenfolge wie in katalogProdukteUncached().
-- ──────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS sebo.idx_produkte_fts;

CREATE INDEX idx_produkte_fts ON sebo.produkte
  USING GIN (to_tsvector('simple'::regconfig,
    coalesce(name, '')             || ' ' ||
    coalesce(kurzbeschreibung, '') || ' ' ||
    coalesce(beschreibung, '')     || ' ' ||
    coalesce(era, '')              || ' ' ||
    coalesce(material, '')         || ' ' ||
    coalesce(herkunft, '')         || ' ' ||
    coalesce(artikel_code, '')     || ' ' ||
    sebo.fts_tags(tags)
  ));

-- ──────────────────────────────────────────────────────────────────────────
-- 2) Fehlende Indizes für Listen-/Dashboard-Queries (SEV-2.C / SEV-2.D)
-- ──────────────────────────────────────────────────────────────────────────

-- Admin-Order-Liste ohne Status-Filter: ORDER BY erstellt_am DESC
CREATE INDEX IF NOT EXISTS idx_orders_erstellt
  ON sebo.orders (erstellt_am DESC);

-- umsatzTrend() / aktivitaetsFeed() / Statistik: Filter auf bezahlt_am
CREATE INDEX IF NOT EXISTS idx_orders_bezahlt_am
  ON sebo.orders (bezahlt_am DESC)
  WHERE bezahlt_am IS NOT NULL;

-- aktivitaetsFeed() / „heute versandt": Filter auf versendet_am
CREATE INDEX IF NOT EXISTS idx_orders_versendet_am
  ON sebo.orders (versendet_am DESC)
  WHERE versendet_am IS NOT NULL;

-- Hauptbild-Subquery in allen Listing-Queries
-- (ORDER BY ist_hauptbild DESC, sortierung, erstellt_am)
CREATE INDEX IF NOT EXISTS idx_bilder_hauptbild_sort
  ON sebo.produktbilder (produkt_id, ist_hauptbild DESC, sortierung, erstellt_am);

-- Admin-Kundenliste ohne Typ-Filter: ORDER BY erstellt_am DESC
CREATE INDEX IF NOT EXISTS idx_customers_erstellt
  ON sebo.customers (erstellt_am DESC);

-- adminBadgeCounts(): offene, unversendete Orders (partial)
CREATE INDEX IF NOT EXISTS idx_orders_pending_unshipped
  ON sebo.orders (status)
  WHERE status IN ('pending', 'paid') AND versendet_am IS NULL;

-- ──────────────────────────────────────────────────────────────────────────
-- 3) CHECK-Constraint auf push_subscriptions.audience (SEV-1.C)
--    Verhindert ungültige Werte; die Push-Routing-Logik (operator vs customer)
--    hängt an diesem Feld. Defensiv: erst bestehende Fremdwerte normalisieren.
-- ──────────────────────────────────────────────────────────────────────────
UPDATE sebo.push_subscriptions
   SET audience = 'operator'
 WHERE audience NOT IN ('operator', 'customer');

ALTER TABLE sebo.push_subscriptions
  DROP CONSTRAINT IF EXISTS chk_push_audience;

ALTER TABLE sebo.push_subscriptions
  ADD CONSTRAINT chk_push_audience
  CHECK (audience IN ('operator', 'customer'));
