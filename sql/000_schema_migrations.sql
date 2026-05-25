-- =============================================================================
-- galeriedutemps · Migration-Tracking
-- Wird IMMER zuerst ausgeführt (Präfix 000).
-- npm run db:migrate liest sql/*.sql in alphabetischer Reihenfolge,
-- vergleicht mit dieser Tabelle und führt nur neue Files aus.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS sebo;

CREATE TABLE IF NOT EXISTS sebo.schema_migrations (
    filename       VARCHAR(200) PRIMARY KEY,
    sha256         CHAR(64)     NOT NULL,                 -- Dateiinhalt-Hash → erkennt Änderungen
    executed_am    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    executed_von   VARCHAR(100) NOT NULL DEFAULT current_user,
    dauer_ms       INTEGER
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_zeit
    ON sebo.schema_migrations(executed_am DESC);

COMMENT ON TABLE sebo.schema_migrations IS
    'Tracking aller ausgeführten SQL-Migrationen. Niemals manuell DELETEn — Migrations sind idempotent.';
