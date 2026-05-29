-- 061_brands.sql
-- Brand-System (Iteration 2).
--
-- Eine Marke (Brand) = Name + Slug + Logo/Cover + mehrsprachige Beschreibung
-- (I18nText {ru,en,de}) + Video-Liste ({url,titel?}[]) + Intro-Block-Array
-- (LandingBlock[], wie Landing-Pages / Produkt-Story). Produkte, Journal-Posts,
-- Instagram-Posts und Landing-Pages können optional einer Marke zugeordnet
-- werden (brand_id → ON DELETE SET NULL: Löschen einer Marke entkoppelt nur).
--
-- Alles idempotent (IF [NOT] EXISTS). Der Migrations-Runner
-- (scripts/db-migrate.mjs) fährt jede Datei in einer Transaktion — kein
-- CREATE INDEX CONCURRENTLY.

CREATE TABLE IF NOT EXISTS sebo.brands (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              text          UNIQUE NOT NULL,
  name              text          NOT NULL,
  logo_url          text,
  cover_url         text,
  -- I18nText {ru,en,de}
  beschreibung      jsonb         NOT NULL DEFAULT '{}'::jsonb,
  -- Array von {url, titel?}
  videos            jsonb         NOT NULL DEFAULT '[]'::jsonb,
  -- LandingBlock[] (optionaler Design-Bereich oben auf der Brand-Page)
  intro_blocks      jsonb         NOT NULL DEFAULT '[]'::jsonb,
  aktiv             boolean       NOT NULL DEFAULT true,
  sortierung        int           NOT NULL DEFAULT 0,
  seo_titel         text,
  seo_beschreibung  text,
  erstellt_am       timestamptz   NOT NULL DEFAULT now(),
  aktualisiert_am   timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brands_slug
  ON sebo.brands (slug);
CREATE INDEX IF NOT EXISTS idx_brands_aktiv_sort
  ON sebo.brands (aktiv, sortierung);

-- ── Brand-Kopplung an die 4 Inhalts-Tabellen ────────────────────────────────
ALTER TABLE sebo.produkte
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES sebo.brands(id) ON DELETE SET NULL;
ALTER TABLE sebo.journal_posts
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES sebo.brands(id) ON DELETE SET NULL;
ALTER TABLE sebo.instagram_posts
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES sebo.brands(id) ON DELETE SET NULL;
ALTER TABLE sebo.landing_pages
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES sebo.brands(id) ON DELETE SET NULL;

-- Partial-Indizes (nur gesetzte brand_id) für die Brand-Aggregations-Queries.
CREATE INDEX IF NOT EXISTS idx_produkte_brand
  ON sebo.produkte (brand_id) WHERE brand_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journal_posts_brand
  ON sebo.journal_posts (brand_id) WHERE brand_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_instagram_posts_brand
  ON sebo.instagram_posts (brand_id) WHERE brand_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_landing_pages_brand
  ON sebo.landing_pages (brand_id) WHERE brand_id IS NOT NULL;
