-- ────────────────────────────────────────────────────────────────────────────
-- 041_audit_log.sql — Append-only Audit-Trail für sensible Operationen
--
-- Zweck: Nachvollziehbarkeit sicherheitsrelevanter Änderungen — primär das
-- Umschalten des Feature-Flags `kaufen_aktiv` (Shop ↔ Schaufenster), perspektivisch
-- auch andere Admin-Aktionen. Append-only: Einträge werden nie geändert/gelöscht.
--
-- Spalten:
--   action       — Aktions-Slug (z.B. 'feature_flag_changed')
--   actor_email  — wer (Admin-E-Mail aus der Session; NULL wenn unbekannt)
--   entity       — betroffenes Objekt (z.B. der Flag-Key 'kaufen_aktiv')
--   alt_wert     — Zustand vorher (JSONB)
--   neu_wert     — Zustand nachher (JSONB)
--   erstellt_am  — Zeitstempel
--
-- Geschrieben via src/lib/db/audit-log.ts (auditLog()).
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sebo.audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action       TEXT        NOT NULL,
  actor_email  TEXT,
  entity       TEXT,
  alt_wert     JSONB,
  neu_wert     JSONB,
  erstellt_am  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lookup nach Aktionstyp, neueste zuerst (Admin-Audit-Ansicht / Forensik).
CREATE INDEX IF NOT EXISTS idx_audit_log_action_zeit
  ON sebo.audit_log (action, erstellt_am DESC);

COMMENT ON TABLE sebo.audit_log IS
  'Append-only Audit-Trail. Sicherheitsrelevante Änderungen (z.B. kaufen_aktiv-Toggle).';

-- =============================================================================
-- ENDE 041_audit_log.sql
-- =============================================================================
