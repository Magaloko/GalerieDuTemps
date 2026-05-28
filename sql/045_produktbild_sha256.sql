-- ────────────────────────────────────────────────────────────────────────────
-- 045_produktbild_sha256.sql — Bild-Dedup über SHA-256 der Originaldatei
--
-- Verhindert doppelte Drafts beim Massen-Upload, wenn dasselbe Foto erneut
-- hochgeladen wird. Der Hash bezieht sich auf die HOCHGELADENEN Originalbytes
-- (nicht die verarbeiteten WebP-Varianten), damit Re-Uploads erkannt werden.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE sebo.produktbilder
  ADD COLUMN IF NOT EXISTS sha256 TEXT;

-- Schneller Dedup-Lookup.
CREATE INDEX IF NOT EXISTS idx_produktbilder_sha256
  ON sebo.produktbilder (sha256)
  WHERE sha256 IS NOT NULL;

COMMENT ON COLUMN sebo.produktbilder.sha256 IS
  'SHA-256 der hochgeladenen Originaldatei (Dedup). NULL für Legacy-Bilder.';

-- =============================================================================
-- ENDE 045_produktbild_sha256.sql
-- =============================================================================
