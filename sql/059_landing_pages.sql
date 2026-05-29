-- 059_landing_pages.sql
-- Block-basierter Landing-Page-Builder (Iteration 1).
--
-- Eine Landing-Page = Titel + Slug + Status + JSONB-Block-Array (wie die
-- Produkt-Story / Newsletter-Blöcke). Optional als Startseite markierbar:
-- ein Partial-Unique-Index garantiert, dass höchstens EINE Page gleichzeitig
-- ist_startseite=true sein kann.
--
-- Alles idempotent (IF [NOT] EXISTS). Der Migrations-Runner
-- (scripts/db-migrate.mjs) fährt jede Datei in einer Transaktion — kein
-- CREATE INDEX CONCURRENTLY.

CREATE TABLE IF NOT EXISTS sebo.landing_pages (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              text          UNIQUE NOT NULL,
  titel             text          NOT NULL,
  status            text          NOT NULL DEFAULT 'entwurf'
                                  CHECK (status IN ('entwurf', 'veroeffentlicht', 'archiviert')),
  blocks            jsonb         NOT NULL DEFAULT '[]'::jsonb,
  ist_startseite    boolean       NOT NULL DEFAULT false,
  seo_titel         text,
  seo_beschreibung  text,
  erstellt_am       timestamptz   NOT NULL DEFAULT now(),
  aktualisiert_am   timestamptz   NOT NULL DEFAULT now()
);

-- Höchstens EINE Startseite gleichzeitig (Partial-Unique-Index).
CREATE UNIQUE INDEX IF NOT EXISTS idx_landing_startseite
  ON sebo.landing_pages (ist_startseite)
  WHERE ist_startseite = true;

-- Listen-/Public-Query-Indizes.
CREATE INDEX IF NOT EXISTS idx_landing_status ON sebo.landing_pages (status);
CREATE INDEX IF NOT EXISTS idx_landing_slug   ON sebo.landing_pages (slug);
