-- ═══════════════════════════════════════════════════════════════════════════
-- _APPLY_FULL_BACKFILL.sql
-- Generiert: 2026-05-27T19:48:20.203Z
--
-- EINMALIG in Supabase SQL Editor ausführen (paste → Run).
--
-- Was passiert:
--  1. Migrationen 029 + 030 anwenden (Schema-Änderungen)
--  2. Back-Fill: alle sql/NNN_*.sql Dateien in sebo.schema_migrations
--     eintragen, sodass /admin/einstellungen/system OK zeigt.
--
-- Idempotent: alles ON CONFLICT DO NOTHING / IF NOT EXISTS.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 029_feature_flags.sql ─────────────────────────────────────────────────────────
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


-- ─── 030_bilder_varianten.sql ─────────────────────────────────────────────────────────
-- ────────────────────────────────────────────────────────────────────────────
-- 030_bilder_varianten.sql — Multi-Resolution Image Variants
--
-- Bisher hatten Produkt-Bilder nur EINE URL (Original). Das führt zu:
--   - iPhone-HEICs werden 1:1 ausgeliefert (10MB Mobile-Datenverbrauch)
--   - Galerie-Grid lädt Hi-Res-Bilder unnötig (Performance)
--   - Kein WebP-Fallback für alte Browser
--
-- Diese Migration erweitert sebo.produktbilder um Varianten:
--   url            — Original (compressed, EXIF gestrippt, ggf. HEIC→WebP)
--   url_thumb      — 400px max Kantenlänge, WebP (Galerie-Grid, Cart-Mini)
--   url_medium     — 800px max, WebP (Produkt-Detail Standard)
--   url_large      — 1600px max, WebP (Zoom, Lightbox)
--   format         — Original-Format (jpeg/png/webp/heic/avif) — für Debug
--
-- Pipeline (siehe src/lib/storage/upload.ts):
--   1. EXIF auto-rotate (iPhone Hochformat-Bug-Fix)
--   2. Strip EXIF (Privacy: keine GPS-Koordinaten leaken)
--   3. Generate 3 WebP-Variants in parallel via sharp
--   4. Speichere Original auch komprimiert (mozjpeg q=88)
--
-- Backwards-Compat: Bestehende Bilder behalten ihre url, neue Spalten = NULL.
-- Frontend nutzt url als Fallback wenn url_medium IS NULL.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE sebo.produktbilder
  ADD COLUMN IF NOT EXISTS url_thumb  VARCHAR(500),
  ADD COLUMN IF NOT EXISTS url_medium VARCHAR(500),
  ADD COLUMN IF NOT EXISTS url_large  VARCHAR(500),
  ADD COLUMN IF NOT EXISTS format     VARCHAR(20);

COMMENT ON COLUMN sebo.produktbilder.url IS
  'Original-URL (komprimiert, EXIF gestrippt). Immer gesetzt.';
COMMENT ON COLUMN sebo.produktbilder.url_thumb IS
  '400px max WebP-Variante für Galerie-Grids. NULL für legacy-Bilder.';
COMMENT ON COLUMN sebo.produktbilder.url_medium IS
  '800px max WebP für Produkt-Detail-Standard-View.';
COMMENT ON COLUMN sebo.produktbilder.url_large IS
  '1600px max WebP für Zoom/Lightbox.';
COMMENT ON COLUMN sebo.produktbilder.format IS
  'Original-Format (jpeg, png, webp, heic, avif) — für Debug + Statistik.';


-- ═══ Tracking-Backfill ═══════════════════════════════════════════════════
-- Marker für ALLE Migrations-Files mit echtem SHA256 der aktuellen Datei.
-- ON CONFLICT DO NOTHING → bestehende Einträge bleiben unverändert.

INSERT INTO sebo.schema_migrations (filename, sha256, dauer_ms) VALUES
  ('000_schema_migrations.sql', 'def2d1453e7b9191bf3170a9f7fbefbd816e3701d16b0cfd5f7fb4e3d158ceef', 0),
  ('001_sebo_schema.sql', 'e7b86b1eada927d04e976dc2a0719cd643a2d0ba1018efd35ca16e7090c86adf', 0),
  ('002_function_update_aktualisiert_am.sql', '06f8158f3269d5f42469956fff9956d7cfd2df0020aaf0677446629f76031cd5', 0),
  ('003_affiliate_schema.sql', '778ccbe250a99edfff671dfd3b4dda9a47c9fb194c78c949c91e910e29bcbd19', 0),
  ('004_seed.sql', '8f4933ad2c49fd6f7284a58205b4312425a405ca6a2f81e5abe3eab497965d60', 0),
  ('005_polish.sql', '0b40a3d6634a75b5ed9633ac8d8350a95c162f016afcb06074585cf51d578dc2', 0),
  ('006_ecommerce.sql', '5cf1290da8f3c7e2e483903161337eca0e87ffa74dd7fa11720eee8e4dca4e21', 0),
  ('007_customer_b2b_invoices.sql', '21c15652a7261c996ae02c81e85ae9311199ddd5d9824a7276cbb9ea7909e88b', 0),
  ('008_crm.sql', 'f40744d0ae1d53aa4ce3873d80b585540f4ede6888b5b9c3d516ce82be6508b7', 0),
  ('009_newsletter_journal.sql', '0825222f023de3100901239875de75013e07b76267fe98433ea6607689f162d0', 0),
  ('010_kasachstan.sql', '2b4cdd342ab2aa975772bf061e89e86b1b23e2b6b26c364c3c5d72fd264b1561', 0),
  ('011_affiliate_kaspi.sql', 'bd5f4c0cfadf119aaa7dc0114b439566b6ad4d71f23ad27de2e0578e6d85e796', 0),
  ('012_fts_multilingual.sql', '0b619b47d531c018cf1e00a92f92ce8c41b27d70578dc91cb5d71bcd82658b16', 0),
  ('013_kategorien_ru.sql', 'adee0dc65d74d5c13512108e9f939e78404a2d978530c0a9c74074cb515ca54f', 0),
  ('014_produkt_artikel_code_aktiv.sql', '75a65442f440136e305f01b56810b30cfc9fc3643d827d852020f2db9228fb38', 0),
  ('015_kategorien_code.sql', '8c737e7ed9dc048cee51489d3567ed7d247250ebdda0055a8a0dac246bc9b411', 0),
  ('016_produkt_preise.sql', 'fd1897c50427e4cfe76b8dc28e43d72d47482aaffa0a6bce6daded1b1e6daa9f', 0),
  ('017_produkt_medien.sql', '33863051792c47b300812a3cb7b93aeca55019ec6c519e3fa3f8ed674787e883', 0),
  ('018_produkt_dateien_zertifikate.sql', '247083624792d14c32a9423a01b521ef1303746dec3dc498c7a1c2bc37028f6b', 0),
  ('019_fts_tags_material.sql', '0e2e45a30712eff89f42a574fea1a246bf3c38dcfd22107786c0d4c13d2e619d', 0),
  ('020_leads_inbox.sql', 'a7862da35f59e049b6798535746b351ac49af8db1852b9a2770ba6d08f244fd4', 0),
  ('021_telegram_notifications.sql', 'a75c3dae2e220d9a765724d365edccc1370758fb6c30204fec52eee3b7632937', 0),
  ('022_artikel_code_seq.sql', 'af87950196e253bd55b941da052c5226ded595a615b4f505959072d44b4f0bd1', 0),
  ('023_produkt_i18n.sql', 'b7f766c64c9c3ed4d2d46c76e8973d8ecc72b810599c6cb756c41ded860bc1fa', 0),
  ('024_wechselkurse.sql', '95e568e362cf9d624538812e004d00ddf457d6f27f512e168bd91362694c10fa', 0),
  ('025_marketing_strings.sql', '0085fb5d3b9e300e4dc9898a1be0453ff66021266b735863c5775e005ac6ea93', 0),
  ('026_customer_telegram.sql', '780833880a309e8c88622ed8cadf3fafa493f08fdff772b54f62b96364628666', 0),
  ('027_payment_methods.sql', '23fbac70ec50d7073574deb6ade40746d4471271ff8a19d73676253b5b8b41ce', 0),
  ('028_theme_settings.sql', 'e9a0b1b88bd5298677edc5a8dcbd75212705530ef38612a6a864c604d05aac37', 0),
  ('029_feature_flags.sql', 'dbd4b96c7b73fe084c37fc9430ebb9245a370195133a3b7945353ed280288f11', 0),
  ('030_bilder_varianten.sql', '31e055c96331b5ef6dc22863e8efb929abb73c8c5398fed04abb913b30b5c215', 0)
ON CONFLICT (filename) DO NOTHING;

COMMIT;

-- Verifikation:
-- SELECT COUNT(*) AS migrationen FROM sebo.schema_migrations;
--   → Sollte 31 sein.
-- SELECT * FROM sebo.feature_flags;
-- SELECT column_name FROM information_schema.columns
--  WHERE table_schema='sebo' AND table_name='produktbilder' ORDER BY ordinal_position;
