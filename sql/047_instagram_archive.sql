-- ────────────────────────────────────────────────────────────────────────────
-- 047_instagram_archive.sql — Kuratiertes Instagram-Archiv (Mini-App)
--
-- Der Betreiber fügt einen Instagram-Embed (oder URL) ein, ordnet ihn einer
-- EIGENEN Kategorie zu (getrennt von den Produkt-Kategorien) und optional einem
-- Produkt. Besucher sehen einen gefilterten Feed in /tg/instagram.
--
-- Nur der kanonische Permalink + Shortcode werden gespeichert (kein volles
-- Embed-HTML) — das Markup baut die App selbst (instagram-embeds-Muster).
-- ────────────────────────────────────────────────────────────────────────────

-- Eigene Archiv-Kategorien (z.B. Посуда / Украшения / Образы / За кулисами)
CREATE TABLE IF NOT EXISTS sebo.instagram_kategorien (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  sortierung  INT  NOT NULL DEFAULT 0,
  aktiv       BOOLEAN NOT NULL DEFAULT true,
  erstellt_am TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Archiv-Posts (ein Instagram-Reel/Post pro Zeile)
CREATE TABLE IF NOT EXISTS sebo.instagram_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permalink    TEXT NOT NULL UNIQUE,                 -- kanonische IG-URL
  shortcode    TEXT NOT NULL UNIQUE,                 -- z.B. "DYsTivPCWiF"
  typ          TEXT NOT NULL DEFAULT 'p',            -- 'p' | 'reel' | 'tv'
  kategorie_id INT  REFERENCES sebo.instagram_kategorien(id) ON DELETE SET NULL,
  produkt_id   UUID REFERENCES sebo.produkte(id)     ON DELETE SET NULL,
  titel        TEXT,
  sortierung   INT  NOT NULL DEFAULT 0,
  aktiv        BOOLEAN NOT NULL DEFAULT true,
  erstellt_am  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instagram_posts_kategorie ON sebo.instagram_posts (kategorie_id);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_aktiv     ON sebo.instagram_posts (aktiv, sortierung);

-- Starter-Kategorien (idempotent). Slugs lateinisiert für stabile URL-Params.
INSERT INTO sebo.instagram_kategorien (name, slug, sortierung) VALUES
  ('Посуда',       'posuda',      10),
  ('Украшения',    'ukrasheniya', 20),
  ('Образы',       'obrazy',      30),
  ('За кулисами',  'za-kulisami', 40)
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE sebo.instagram_posts IS
  'Kuratiertes Instagram-Archiv: kanonischer Permalink + Shortcode, eigene Kategorie, optionale Produkt-Verknüpfung.';

-- =============================================================================
-- ENDE 047_instagram_archive.sql
-- =============================================================================
