import { AlertTriangle } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
 * UploadVolumeBanner — Server-Component, lädt /api/health/uploads-Status
 * und zeigt PROMINENTE Warnung wenn das Upload-Verzeichnis nicht persistent
 * gemountet ist.
 *
 * Wichtig auf produkte/neu und produkte/[id]/bilder: ohne Volume-Mount
 * verschwinden Bilder beim nächsten Coolify-Deploy → Admin würde sonst
 * Stunden Arbeit in den Müll werfen.
 * ────────────────────────────────────────────────────────────────────────── */

interface HealthResult {
  ok:        boolean;
  uploadDir: string;
  envSet:    boolean;
  fileCount?: number;
  problem?:  string;
}

async function getUploadHealth(): Promise<HealthResult | null> {
  // Direkt die DB-Lib aufrufen statt fetch (kein HTTP-Roundtrip).
  try {
    const { stat, readdir } = await import("fs/promises");
    const { join } = await import("path");
    const uploadDir = process.env.UPLOAD_DIR ?? join(process.cwd(), "public", "uploads");
    const envSet    = Boolean(process.env.UPLOAD_DIR);
    try {
      const info = await stat(uploadDir);
      if (!info.isDirectory()) {
        return { ok: false, uploadDir, envSet, problem: "Pfad existiert, ist kein Verzeichnis" };
      }
      const entries = await readdir(uploadDir);
      return { ok: true, uploadDir, envSet, fileCount: entries.length };
    } catch {
      return { ok: false, uploadDir, envSet, problem: "ENOENT — Verzeichnis nicht erreichbar (Volume nicht gemountet?)" };
    }
  } catch {
    return null;
  }
}

export async function UploadVolumeBanner() {
  const h = await getUploadHealth();
  if (!h || h.ok) return null;

  return (
    <div
      className="p-4 mb-6"
      style={{
        background:  "rgba(232,112,58,0.08)",
        border:      "1px solid rgba(232,112,58,0.45)",
        borderLeft:  "4px solid var(--color-coral)",
      }}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--color-coral)" }} />
        <div className="flex-1 min-w-0 text-sm">
          <p style={{ color: "var(--color-ink)", fontWeight: 500 }}>
            ⚠ Upload-Verzeichnis nicht persistent — Bilder gehen beim nächsten Deploy verloren!
          </p>
          <p className="mt-1.5" style={{ color: "var(--color-ink-soft)" }}>
            <b>Pfad:</b> <code style={{
              background: "#fff", padding: "1px 6px",
              border: "1px solid var(--color-line)",
              fontFamily: "var(--font-mono)", fontSize: 12,
            }}>{h.uploadDir}</code><br/>
            <b>Problem:</b> {h.problem}<br/>
            <b>UPLOAD_DIR env:</b> {h.envSet ? "gesetzt" : "NICHT gesetzt → default /app/public/uploads"}
          </p>
          <p className="mt-2 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
            <b>Fix in Coolify:</b> Storage-Tab → Add Persistent Volume → Source <code style={{
              background: "#fff", padding: "1px 4px", border: "1px solid var(--color-line)",
              fontFamily: "var(--font-mono)", fontSize: 12,
            }}>vintage-uploads</code> → Destination <code style={{
              background: "#fff", padding: "1px 4px", border: "1px solid var(--color-line)",
              fontFamily: "var(--font-mono)", fontSize: 12,
            }}>{h.uploadDir}</code> → Redeploy.
          </p>
        </div>
      </div>
    </div>
  );
}
