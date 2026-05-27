-- ═══════════════════════════════════════════════════════════════════════════
-- _APPLY_RENAME_MIGRATIONS_2026-05.sql
--
-- EINMALIG IN PRODUKTION AUSFÜHREN (Supabase SQL Editor → paste → Run)
--
-- Hintergrund:
-- Die Migrations-Files hatten doppelte Nummern-Präfixe (003_ und 021_), was die
-- Sort-Reihenfolge fragil machte. Im Mai 2026 wurden alle Files ab 004 lückenlos
-- durchnummeriert (003_seed → 004_seed, 004_polish → 005_polish, …, 026_theme →
-- 028_theme). Damit `npm run db:migrate` die bereits ausgeführten Migrationen
-- nicht erneut anwendet, muss `sebo.schema_migrations` auf die neuen Filenames
-- gemappt werden — diese Datei macht genau das.
--
-- Idempotent: Mehrfach-Ausführung ist safe.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- Falls die Tabelle noch nicht existiert, abbrechen — sonst löschen wir alte Daten.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'sebo' AND table_name = 'schema_migrations'
  ) THEN
    RAISE NOTICE 'sebo.schema_migrations existiert nicht — nichts zu tun.';
    RETURN;
  END IF;
END $$;

-- Rename: alte → neue Filenames
-- Pattern: UPDATE ... WHERE filename = '<alt>' AND NOT EXISTS (<neuer schon da>)
-- So bleibt es idempotent: Wenn die neue Migration schon gelaufen ist (anderer
-- Tracking-Entry), passiert nichts.

UPDATE sebo.schema_migrations SET filename = '004_seed.sql'
  WHERE filename = '003_seed.sql'
    AND NOT EXISTS (SELECT 1 FROM sebo.schema_migrations WHERE filename = '004_seed.sql');

UPDATE sebo.schema_migrations SET filename = '005_polish.sql'
  WHERE filename = '004_polish.sql'
    AND NOT EXISTS (SELECT 1 FROM sebo.schema_migrations WHERE filename = '005_polish.sql');

UPDATE sebo.schema_migrations SET filename = '006_ecommerce.sql'
  WHERE filename = '005_ecommerce.sql'
    AND NOT EXISTS (SELECT 1 FROM sebo.schema_migrations WHERE filename = '006_ecommerce.sql');

UPDATE sebo.schema_migrations SET filename = '007_customer_b2b_invoices.sql'
  WHERE filename = '006_customer_b2b_invoices.sql'
    AND NOT EXISTS (SELECT 1 FROM sebo.schema_migrations WHERE filename = '007_customer_b2b_invoices.sql');

UPDATE sebo.schema_migrations SET filename = '008_crm.sql'
  WHERE filename = '007_crm.sql'
    AND NOT EXISTS (SELECT 1 FROM sebo.schema_migrations WHERE filename = '008_crm.sql');

UPDATE sebo.schema_migrations SET filename = '009_newsletter_journal.sql'
  WHERE filename = '008_newsletter_journal.sql'
    AND NOT EXISTS (SELECT 1 FROM sebo.schema_migrations WHERE filename = '009_newsletter_journal.sql');

UPDATE sebo.schema_migrations SET filename = '010_kasachstan.sql'
  WHERE filename = '009_kasachstan.sql'
    AND NOT EXISTS (SELECT 1 FROM sebo.schema_migrations WHERE filename = '010_kasachstan.sql');

UPDATE sebo.schema_migrations SET filename = '011_affiliate_kaspi.sql'
  WHERE filename = '010_affiliate_kaspi.sql'
    AND NOT EXISTS (SELECT 1 FROM sebo.schema_migrations WHERE filename = '011_affiliate_kaspi.sql');

UPDATE sebo.schema_migrations SET filename = '012_fts_multilingual.sql'
  WHERE filename = '011_fts_multilingual.sql'
    AND NOT EXISTS (SELECT 1 FROM sebo.schema_migrations WHERE filename = '012_fts_multilingual.sql');

UPDATE sebo.schema_migrations SET filename = '013_kategorien_ru.sql'
  WHERE filename = '012_kategorien_ru.sql'
    AND NOT EXISTS (SELECT 1 FROM sebo.schema_migrations WHERE filename = '013_kategorien_ru.sql');

UPDATE sebo.schema_migrations SET filename = '014_produkt_artikel_code_aktiv.sql'
  WHERE filename = '013_produkt_artikel_code_aktiv.sql'
    AND NOT EXISTS (SELECT 1 FROM sebo.schema_migrations WHERE filename = '014_produkt_artikel_code_aktiv.sql');

UPDATE sebo.schema_migrations SET filename = '015_kategorien_code.sql'
  WHERE filename = '014_kategorien_code.sql'
    AND NOT EXISTS (SELECT 1 FROM sebo.schema_migrations WHERE filename = '015_kategorien_code.sql');

UPDATE sebo.schema_migrations SET filename = '016_produkt_preise.sql'
  WHERE filename = '015_produkt_preise.sql'
    AND NOT EXISTS (SELECT 1 FROM sebo.schema_migrations WHERE filename = '016_produkt_preise.sql');

UPDATE sebo.schema_migrations SET filename = '017_produkt_medien.sql'
  WHERE filename = '016_produkt_medien.sql'
    AND NOT EXISTS (SELECT 1 FROM sebo.schema_migrations WHERE filename = '017_produkt_medien.sql');

UPDATE sebo.schema_migrations SET filename = '018_produkt_dateien_zertifikate.sql'
  WHERE filename = '017_produkt_dateien_zertifikate.sql'
    AND NOT EXISTS (SELECT 1 FROM sebo.schema_migrations WHERE filename = '018_produkt_dateien_zertifikate.sql');

UPDATE sebo.schema_migrations SET filename = '019_fts_tags_material.sql'
  WHERE filename = '018_fts_tags_material.sql'
    AND NOT EXISTS (SELECT 1 FROM sebo.schema_migrations WHERE filename = '019_fts_tags_material.sql');

UPDATE sebo.schema_migrations SET filename = '020_leads_inbox.sql'
  WHERE filename = '019_leads_inbox.sql'
    AND NOT EXISTS (SELECT 1 FROM sebo.schema_migrations WHERE filename = '020_leads_inbox.sql');

UPDATE sebo.schema_migrations SET filename = '021_telegram_notifications.sql'
  WHERE filename = '020_telegram_notifications.sql'
    AND NOT EXISTS (SELECT 1 FROM sebo.schema_migrations WHERE filename = '021_telegram_notifications.sql');

UPDATE sebo.schema_migrations SET filename = '022_artikel_code_seq.sql'
  WHERE filename = '021_artikel_code_seq.sql'
    AND NOT EXISTS (SELECT 1 FROM sebo.schema_migrations WHERE filename = '022_artikel_code_seq.sql');

UPDATE sebo.schema_migrations SET filename = '023_produkt_i18n.sql'
  WHERE filename = '021_produkt_i18n.sql'
    AND NOT EXISTS (SELECT 1 FROM sebo.schema_migrations WHERE filename = '023_produkt_i18n.sql');

UPDATE sebo.schema_migrations SET filename = '024_wechselkurse.sql'
  WHERE filename = '022_wechselkurse.sql'
    AND NOT EXISTS (SELECT 1 FROM sebo.schema_migrations WHERE filename = '024_wechselkurse.sql');

UPDATE sebo.schema_migrations SET filename = '025_marketing_strings.sql'
  WHERE filename = '023_marketing_strings.sql'
    AND NOT EXISTS (SELECT 1 FROM sebo.schema_migrations WHERE filename = '025_marketing_strings.sql');

UPDATE sebo.schema_migrations SET filename = '026_customer_telegram.sql'
  WHERE filename = '024_customer_telegram.sql'
    AND NOT EXISTS (SELECT 1 FROM sebo.schema_migrations WHERE filename = '026_customer_telegram.sql');

UPDATE sebo.schema_migrations SET filename = '027_payment_methods.sql'
  WHERE filename = '025_payment_methods.sql'
    AND NOT EXISTS (SELECT 1 FROM sebo.schema_migrations WHERE filename = '027_payment_methods.sql');

UPDATE sebo.schema_migrations SET filename = '028_theme_settings.sql'
  WHERE filename = '026_theme_settings.sql'
    AND NOT EXISTS (SELECT 1 FROM sebo.schema_migrations WHERE filename = '028_theme_settings.sql');

COMMIT;

-- Verifikation: sollte jetzt 28+ Einträge ohne Duplikate haben
-- SELECT filename, executed_am FROM sebo.schema_migrations ORDER BY filename;
