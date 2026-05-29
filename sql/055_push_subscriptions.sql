-- 055_push_subscriptions.sql
-- Web-Push-Subscriptions für Operator-Alerts (Push aufs Handy bei neuem Lead /
-- neuer Bestellung). Eine Zeile pro Browser/Gerät-Endpoint eines Admins.
--
-- endpoint ist global eindeutig (vom Push-Service vergeben) → UNIQUE erlaubt
-- Upsert ON CONFLICT (endpoint). Tote Subscriptions (404/410 beim Senden)
-- werden serverseitig per endpoint gelöscht (siehe src/lib/push/web-push.ts).

CREATE TABLE IF NOT EXISTS sebo.push_subscriptions (
  id            BIGSERIAL PRIMARY KEY,
  benutzer_id   UUID REFERENCES sebo.benutzer(id) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL UNIQUE,
  p256dh        TEXT NOT NULL,
  auth          TEXT NOT NULL,
  user_agent    TEXT,
  erstellt_am   TIMESTAMPTZ NOT NULL DEFAULT now(),
  letzter_push_am TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_push_subs_benutzer ON sebo.push_subscriptions(benutzer_id);
