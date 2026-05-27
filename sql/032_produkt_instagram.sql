-- ────────────────────────────────────────────────────────────────────────────
-- 032_produkt_instagram.sql — Instagram-Reels/Posts pro Produkt
--
-- Galerie du Temps postet ihre Vintage-Funde auch auf Instagram. Bei manchen
-- Produkten ist das IG-Reel besonders informativ (Detail-Aufnahmen, Story
-- des Stücks). Admin soll diese Reels direkt am Produkt verlinken können.
--
-- Storage: TEXT[] mit kanonisierten Permalink-URLs.
--   Format: https://www.instagram.com/(p|reel|tv)/{shortcode}/
--   Reihenfolge des Arrays = Anzeige-Reihenfolge auf der Produktseite.
--
-- Pro Produkt: 0 bis 5 Embeds (UI begrenzt es).
--
-- Frontend rendert pro URL ein <blockquote class="instagram-media">,
-- danach läuft window.instgrm.Embeds.process() das Embed-Skript einmal.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE sebo.produkte
  ADD COLUMN IF NOT EXISTS instagram_urls TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN sebo.produkte.instagram_urls IS
  'Liste der Instagram-Permalink-URLs für dieses Produkt (Posts, Reels, TV). Reihenfolge = Anzeige-Reihenfolge.';
