-- ────────────────────────────────────────────────────────────────────────────
-- 029_feature_flags.sql — Module-Toggles + Feature-Switches
--
-- Erlaubt dem Admin Module zur Laufzeit ein-/auszuschalten ohne Code-Deploy.
-- Beispiele:
--   - B2B-Anfragen aus → nur B2C-Kunden möglich
--   - KI-Assistent aus → Chat-Widget verschwindet, /assistent → 404
--   - Wunschliste aus → Herz-Icons + /wunschliste weg
--
-- Pattern: einfacher KV-Store mit Aktiv-Boolean + Audit-Trail.
--   schluessel       — slug (z.B. 'b2b_anfragen', 'auto_translation')
--   aktiviert        — Master-Toggle
--   beschreibung     — Hinweis im Admin-UI
--   aktualisiert_am  — wann zuletzt geändert
--   aktualisiert_von — welcher Admin (für Audit)
--
-- Lookup im Code via src/lib/db/feature-flags.ts (5s in-memory cache).
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sebo.feature_flags (
  schluessel        TEXT PRIMARY KEY,
  aktiviert         BOOLEAN NOT NULL DEFAULT true,
  beschreibung      TEXT,
  aktualisiert_am   TIMESTAMPTZ NOT NULL DEFAULT now(),
  aktualisiert_von  VARCHAR(120)
);

-- Auto-touch von aktualisiert_am
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

-- Seed: Initiale Flags. ON CONFLICT DO NOTHING → bei Re-Apply der Migration
-- bleiben User-Änderungen erhalten.
INSERT INTO sebo.feature_flags (schluessel, aktiviert, beschreibung) VALUES
  ('b2b_anfragen',     true,  'Регистрация юридических лиц + B2B-цены'),
  ('ki_assistent',     true,  'ИИ-чат-виджет + страница /assistent'),
  ('wunschliste',      true,  'Сердечки на товарах + страница /wunschliste'),
  ('kontaktformular',  true,  'Страница /kontakt + N8N-вебхук'),
  ('auto_translation', false, 'Авто-перевод названий/описаний товаров через DeepSeek (расходует AI-токены)')
ON CONFLICT (schluessel) DO NOTHING;

COMMENT ON TABLE sebo.feature_flags IS
  'Module-Toggles. Zur Laufzeit ein-/ausschaltbar im Admin-UI ohne Code-Deploy.';
