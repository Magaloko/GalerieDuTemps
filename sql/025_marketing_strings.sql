-- ────────────────────────────────────────────────────────────────────────────
-- 025_marketing_strings.sql — Editierbare Marketing-Texte (Hero, Ticker, etc.)
--
-- Bisher waren Slogans, CTA-Labels und Promo-Texte im Code hardcoded — nur
-- per Re-Deploy änderbar. Diese Tabelle bringt sie in die Admin-Oberfläche.
--
-- Designentscheidung: KV-Store mit JSONB für i18n.
--   schluessel — slug-style Key (z.B. 'home.hero.h1_unten')
--   wert_i18n  — { ru: "...", en: "...", de: "..." }  (Sprachen optional)
--   beschreibung — Hinweis für Admin wo dieser String erscheint
--   fallback   — Wert wenn weder DB noch Sprache vorhanden ist (für Migration)
--
-- Lese-Helper in src/lib/db/marketing-strings.ts hat 60s-Cache.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sebo.marketing_strings (
  schluessel       TEXT PRIMARY KEY,
  wert_i18n        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  beschreibung     TEXT,
  fallback         TEXT        NOT NULL DEFAULT '',
  aktualisiert_am  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-Update von aktualisiert_am bei jedem UPDATE
CREATE OR REPLACE FUNCTION sebo.marketing_strings_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.aktualisiert_am := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketing_strings_touch ON sebo.marketing_strings;
CREATE TRIGGER trg_marketing_strings_touch
  BEFORE UPDATE ON sebo.marketing_strings
  FOR EACH ROW EXECUTE FUNCTION sebo.marketing_strings_touch();

-- ── Seed: die wichtigsten editierbaren Strings ─────────────────────────────
INSERT INTO sebo.marketing_strings (schluessel, wert_i18n, beschreibung, fallback) VALUES

-- Hero (Startseite, A1 Editorial)
('home.hero.eyebrow',
 '{"ru":"Rare pieces with history, elegance, and timeless charm.","en":"Rare pieces with history, elegance, and timeless charm.","de":"Rare pieces with history, elegance, and timeless charm."}'::jsonb,
 'Startseite → Hero → Eyebrow oben links',
 'Rare pieces with history, elegance, and timeless charm.'),

('home.hero.h1_oben',
 '{"ru":"Редкие вещи","en":"Rare pieces","de":"Seltene Stücke"}'::jsonb,
 'Startseite → Hero → erste Zeile der großen Überschrift',
 'Редкие вещи'),

('home.hero.h1_unten',
 '{"ru":"с историей.","en":"with history.","de":"mit Geschichte."}'::jsonb,
 'Startseite → Hero → zweite Zeile, italic+coral',
 'с историей.'),

('home.hero.subhead',
 '{"ru":"Кураторская подборка винтажа из Алматы — мебель, керамика, графика, текстиль. Каждый предмет проходит атрибуцию и реставрацию.","en":"A curated vintage selection from Almaty — furniture, ceramics, prints, textiles. Each piece is attributed and restored.","de":"Kuratierte Vintage-Auswahl aus Almaty — Möbel, Keramik, Grafik, Textilien. Jedes Stück wird attribuiert und restauriert."}'::jsonb,
 'Startseite → Hero → Subhead unter der H1',
 'Кураторская подборка винтажа из Алматы.'),

('home.hero.cta_primary',
 '{"ru":"Открыть каталог","en":"Browse catalogue","de":"Katalog öffnen"}'::jsonb,
 'Startseite → Hero → primärer CTA-Button (Coral)',
 'Открыть каталог'),

('home.hero.cta_secondary',
 '{"ru":"Пройти квиз","en":"Take the quiz","de":"Quiz starten"}'::jsonb,
 'Startseite → Hero → sekundärer CTA-Button (ghost)',
 'Пройти квиз'),

-- Ticker (Bar zwischen Hero und Content)
('home.ticker.links',
 '{"ru":"◆ На складе · {n} предметов","en":"◆ In stock · {n} items","de":"◆ Auf Lager · {n} Stücke"}'::jsonb,
 'Startseite → Ticker-Bar links · {n} wird durch Produktanzahl ersetzt',
 '◆ На складе · 342 предметов'),

('home.ticker.mitte',
 '{"ru":"Новые поступления каждую среду","en":"New arrivals every Wednesday","de":"Neuzugänge jeden Mittwoch"}'::jsonb,
 'Startseite → Ticker-Bar Mitte',
 'Новые поступления каждую среду'),

('home.ticker.rechts',
 '{"ru":"Доставка по СНГ ↗","en":"Shipping CIS-wide ↗","de":"Versand in alle GUS-Staaten ↗"}'::jsonb,
 'Startseite → Ticker-Bar rechts',
 'Доставка по СНГ ↗'),

-- Promo-Bar im Header (D1)
('header.promo.links',
 '{"ru":"◆ Бесплатная доставка по Казахстану от ₸ 50 000","en":"◆ Free shipping within Kazakhstan from ₸ 50,000","de":"◆ Kostenloser Versand in Kasachstan ab ₸ 50.000"}'::jsonb,
 'Header → schmale Promo-Bar oben links',
 '◆ Бесплатная доставка по Казахстану от ₸ 50 000'),

('header.promo.rechts',
 '{"ru":"Новые поступления каждую среду","en":"New arrivals every Wednesday","de":"Neuzugänge jeden Mittwoch"}'::jsonb,
 'Header → Promo-Bar oben rechts (Coral)',
 'Новые поступления каждую среду'),

-- Newsletter-Band (Footer)
('footer.newsletter.h1_oben',
 '{"ru":"Подписка на","en":"Subscribe to the","de":"Abonniere das"}'::jsonb,
 'Footer → Newsletter-Band → Headline links',
 'Подписка на'),

('footer.newsletter.h1_italic',
 '{"ru":"журнал","en":"journal","de":"Journal"}'::jsonb,
 'Footer → Newsletter-Band → italic+coral Wort',
 'журнал'),

('footer.newsletter.cta',
 '{"ru":"Подписаться","en":"Subscribe","de":"Abonnieren"}'::jsonb,
 'Footer → Newsletter-Form → Submit-Button',
 'Подписаться'),

-- Story-Teaser auf Startseite
('home.story.eyebrow_override',
 '{"ru":"","en":"","de":""}'::jsonb,
 '(optional) Überschreibt t.home.story_eyebrow wenn nicht leer',
 ''),

('home.story.titel_override',
 '{"ru":"","en":"","de":""}'::jsonb,
 '(optional) Überschreibt t.home.story_titel wenn nicht leer',
 '')

ON CONFLICT (schluessel) DO NOTHING;
