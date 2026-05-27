-- ═══════════════════════════════════════════════════════════════════════════
-- _APPLY_029_030_BILDER.sql
--
-- EINMALIG in Supabase SQL Editor ausführen (paste → Run).
-- Wendet 2 Migrationen + Tracking-Inserts in EINER Transaction an:
--   029_feature_flags.sql       — Module-Toggle-System
--   030_bilder_varianten.sql    — WebP-Variants-Spalten für Produkt-Bilder
--
-- Idempotent: alle Statements nutzen IF NOT EXISTS / ON CONFLICT.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 029_feature_flags.sql ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sebo.feature_flags (
  schluessel        TEXT PRIMARY KEY,
  aktiviert         BOOLEAN NOT NULL DEFAULT true,
  beschreibung      TEXT,
  aktualisiert_am   TIMESTAMPTZ NOT NULL DEFAULT now(),
  aktualisiert_von  VARCHAR(120)
);

CREATE OR REPLACE FUNCTION sebo.feature_flags_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.aktualisiert_am := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_feature_flags_touch ON sebo.feature_flags;
CREATE TRIGGER trg_feature_flags_touch
  BEFORE UPDATE ON sebo.feature_flags
  FOR EACH ROW EXECUTE FUNCTION sebo.feature_flags_touch();

INSERT INTO sebo.feature_flags (schluessel, aktiviert, beschreibung) VALUES
  ('b2b_anfragen',     true,  'Регистрация юридических лиц + B2B-цены'),
  ('ki_assistent',     true,  'ИИ-чат-виджет + страница /assistent'),
  ('wunschliste',      true,  'Сердечки на товарах + страница /wunschliste'),
  ('kontaktformular',  true,  'Страница /kontakt + N8N-вебхук'),
  ('auto_translation', false, 'Авто-перевод названий/описаний товаров через DeepSeek')
ON CONFLICT (schluessel) DO NOTHING;

INSERT INTO sebo.schema_migrations (filename, sha256, dauer_ms) VALUES
  ('029_feature_flags.sql',
   encode(digest(pg_read_file_v2(NULL), 'sha256'), 'hex'),
   0)
ON CONFLICT (filename) DO NOTHING;

-- ─── 030_bilder_varianten.sql ──────────────────────────────────────────────
ALTER TABLE sebo.produktbilder
  ADD COLUMN IF NOT EXISTS url_thumb  VARCHAR(500),
  ADD COLUMN IF NOT EXISTS url_medium VARCHAR(500),
  ADD COLUMN IF NOT EXISTS url_large  VARCHAR(500),
  ADD COLUMN IF NOT EXISTS format     VARCHAR(20);

COMMENT ON COLUMN sebo.produktbilder.url_thumb IS
  '400px max WebP-Variante für Galerie-Grids. NULL für legacy-Bilder.';
COMMENT ON COLUMN sebo.produktbilder.url_medium IS
  '800px max WebP für Produkt-Detail-Standard-View.';
COMMENT ON COLUMN sebo.produktbilder.url_large IS
  '1600px max WebP für Zoom/Lightbox.';
COMMENT ON COLUMN sebo.produktbilder.format IS
  'Original-Format (jpeg, png, webp, heif, avif).';

INSERT INTO sebo.schema_migrations (filename, sha256, dauer_ms) VALUES
  ('030_bilder_varianten.sql',
   encode(digest('manual-apply', 'sha256'), 'hex'),
   0)
ON CONFLICT (filename) DO NOTHING;

COMMIT;

-- Verifikation:
-- SELECT * FROM sebo.feature_flags;
-- SELECT column_name FROM information_schema.columns
--  WHERE table_schema='sebo' AND table_name='produktbilder';
-- SELECT filename, executed_am FROM sebo.schema_migrations
--  WHERE filename IN ('029_feature_flags.sql','030_bilder_varianten.sql');
