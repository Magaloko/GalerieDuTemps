-- ────────────────────────────────────────────────────────────────────────────
-- 051_instagram_thumbnail.sql — Vorschaubild für Instagram-Archiv-Posts
--
-- Bisher zeigten die IG-Karten in der Mini-App nur ein Gradient-Icon + Text,
-- weil kein Bild gespeichert war (Instagram-Embeds sind in der Telegram-WebView
-- blockiert). Mit dieser Spalte kann der Admin ein Cover hochladen; ist der Post
-- mit einem Produkt verknüpft, nutzt die App automatisch dessen Hauptbild als
-- Fallback (kein Admin-Aufwand).
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE sebo.instagram_posts
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

COMMENT ON COLUMN sebo.instagram_posts.thumbnail_url IS
  'Optionales Cover-Bild der IG-Karte. NULL → App nutzt das verknüpfte Produktbild, sonst das Gradient-Icon.';

-- =============================================================================
-- ENDE 051_instagram_thumbnail.sql
-- =============================================================================
