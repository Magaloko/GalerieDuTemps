-- 048  Instagram-Archiv: Kanal-Broadcast-Stempel
-- Tracks when an IG post was broadcast to the Telegram channel (idempotency guard).

INSERT INTO sebo.schema_migrations (version) VALUES ('048') ON CONFLICT DO NOTHING;

ALTER TABLE sebo.instagram_posts
  ADD COLUMN IF NOT EXISTS kanal_gepostet_am timestamptz;
