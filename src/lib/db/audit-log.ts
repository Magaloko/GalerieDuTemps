import { query } from "./index";

/* ──────────────────────────────────────────────────────────────────────────
 * Audit-Log
 *
 * Append-only Trail für sicherheitsrelevante Änderungen (Tabelle
 * sebo.audit_log, Migration 041). Primär: Umschalten von `kaufen_aktiv`
 * (Shop ↔ Schaufenster).
 *
 * Wichtig: Das Audit darf den Hauptpfad NIE brechen. Fehler werden geloggt
 * und geschluckt — eine fehlgeschlagene Audit-Zeile darf z.B. das Speichern
 * eines Feature-Flags nicht verhindern.
 * ────────────────────────────────────────────────────────────────────────── */

export interface AuditEntry {
  /** Aktions-Slug, z.B. "feature_flag_changed". */
  action:      string;
  /** Admin-E-Mail aus der Session (falls bekannt). */
  actorEmail?: string | null;
  /** Betroffenes Objekt, z.B. der Flag-Key. */
  entity?:     string | null;
  /** Zustand vorher (wird als JSONB serialisiert). */
  altWert?:    unknown;
  /** Zustand nachher (wird als JSONB serialisiert). */
  neuWert?:    unknown;
}

/** Schreibt eine Audit-Zeile. Schluckt Fehler (best-effort). */
export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    await query(
      `INSERT INTO sebo.audit_log (action, actor_email, entity, alt_wert, neu_wert)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        entry.action,
        entry.actorEmail ?? null,
        entry.entity ?? null,
        entry.altWert === undefined ? null : JSON.stringify(entry.altWert),
        entry.neuWert === undefined ? null : JSON.stringify(entry.neuWert),
      ],
    );
  } catch (err) {
    // Niemals den Aufrufer brechen — Audit ist best-effort.
    console.warn("[audit-log] Schreiben fehlgeschlagen:", err);
  }
}
