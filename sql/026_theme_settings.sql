-- ────────────────────────────────────────────────────────────────────────────
-- 026_theme_settings.sql — Theme-Customizer (Farben, Logo, Branding)
--
-- Erlaubt dem Admin die komplette visuelle Identität (alle 14 Brand-Farben,
-- Logo-URL, Favicon, Brand-Name + Tagline) ohne Code-Deploy zu ändern.
--
-- Wird vom Root-Layout (src/app/layout.tsx) bei jedem Page-Render geladen
-- und als inline <style>:root { --color-coral: …; … }</style> in den
-- <head> injiziert. CSS-Variable überschreibt die Defaults aus globals.css.
--
-- Cache: 60s in-process (Map). Bei Admin-Save wird Cache invalidiert.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sebo.theme_settings (
  schluessel       TEXT PRIMARY KEY,
  wert             TEXT NOT NULL,
  typ              TEXT NOT NULL DEFAULT 'color'
                   CHECK (typ IN ('color','url','text','toggle')),
  gruppe           TEXT NOT NULL DEFAULT 'colors'
                   CHECK (gruppe IN ('colors','branding','typography')),
  beschreibung     TEXT,
  aktualisiert_am  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION sebo.theme_settings_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.aktualisiert_am := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_theme_settings_touch ON sebo.theme_settings;
CREATE TRIGGER trg_theme_settings_touch
  BEFORE UPDATE ON sebo.theme_settings
  FOR EACH ROW EXECUTE FUNCTION sebo.theme_settings_touch();

-- ── Seed — 14 Brand-Farben + Branding + Typography ──────────────────────────
INSERT INTO sebo.theme_settings (schluessel, wert, typ, gruppe, beschreibung) VALUES

-- Cobalt-Spektrum (Backgrounds, dunkle Bereiche)
('color.cobalt',        '#1B2566', 'color', 'colors', 'Cobalt-Hauptfarbe — Hero, Footer, Brand'),
('color.cobalt-deep',   '#141A4D', 'color', 'colors', 'Cobalt dunkler — Hover-States, Card-Tiefen'),
('color.cobalt-dark',   '#0E1336', 'color', 'colors', 'Cobalt-tiefst — Promo-Bar, Footer-Bottom'),

-- Coral-Spektrum (Akzente, CTAs)
('color.coral',         '#E8703A', 'color', 'colors', 'Coral-Akzentfarbe — Buttons, Links, Highlights'),
('color.coral-bright',  '#F08550', 'color', 'colors', 'Coral heller — Button-Hover'),
('color.coral-deep',    '#C95820', 'color', 'colors', 'Coral dunkler — Button-Active, Errors'),

-- Paper/Bone (helle Hintergründe)
('color.paper',         '#F5F1EA', 'color', 'colors', 'Hauptfarbe heller Bereich — Katalog/Product BG'),
('color.bone',          '#FAF7F1', 'color', 'colors', 'Sub-helles BG — Filter-Sidebar, Cards'),

-- Ink (Texte)
('color.ink',           '#0F1430', 'color', 'colors', 'Haupt-Textfarbe auf hellem BG'),
('color.ink-soft',      '#3A3E5C', 'color', 'colors', 'Sekundärer Text'),
('color.ink-mute',      '#7A7D92', 'color', 'colors', 'Hilfstexte, Captions'),

-- Strukturlinien
('color.line',          '#D9D3C5', 'color', 'colors', 'Hairline-Borders, Separatoren'),

-- Status (3 weitere für später)
('color.success',       '#4A8A6E', 'color', 'colors', 'Status-Grün — Bezahlt, OK'),
('color.warning',       '#C9711B', 'color', 'colors', 'Status-Orange — Achtung'),

-- Branding (Logo, Name)
('brand.logo_url',      '',        'url',    'branding',   'Custom-Logo-URL. Leer = Italiana-Wordmark wird genutzt.'),
('brand.favicon_url',   '/favicon.ico', 'url', 'branding', 'Favicon (16×16/32×32 .ico oder PNG)'),
('brand.show_wordmark', 'true',    'toggle', 'branding',   'Italiana-Wordmark zeigen (auch wenn Logo-URL gesetzt)?'),
('brand.name',          'Galerie du Temps', 'text', 'branding', 'Markenname (für Titel, Footer, og:title)'),
('brand.tagline',       'Rare pieces with history, elegance, and timeless charm.', 'text', 'branding', 'Brand-Tagline')

ON CONFLICT (schluessel) DO NOTHING;
