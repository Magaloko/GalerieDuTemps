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
