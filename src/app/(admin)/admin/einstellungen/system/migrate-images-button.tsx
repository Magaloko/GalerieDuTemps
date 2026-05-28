"use client";

import { useState, useTransition } from "react";
import { HardDriveUpload, Loader2, Check, AlertCircle } from "lucide-react";

interface Result {
  ok: boolean; migrated: number; skipped: number; missing: number;
  total: number; dryRun: boolean; error?: string;
}

/* Ein-Klick-Migration lokaler /uploads-Bilder → Supabase Storage. */
export function MigrateImagesButton() {
  const [pending, start] = useTransition();
  const [res, setRes]    = useState<Result | null>(null);
  const [err, setErr]    = useState<string | null>(null);

  const run = (dryRun: boolean) => {
    setErr(null); setRes(null);
    start(async () => {
      try {
        const r = await fetch("/api/admin/migrate-images", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ dryRun }),
        });
        const data = await r.json();
        if (!r.ok || !data.ok) { setErr(data.error ?? `HTTP ${r.status}`); return; }
        setRes(data);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Fehler");
      }
    });
  };

  return (
    <div className="bg-vintage-white border border-vintage-sand p-5 space-y-3"
         style={{ borderRadius: "var(--radius-card)" }}>
      <div className="flex items-center gap-2">
        <HardDriveUpload className="w-4 h-4 text-vintage-gold" />
        <h3 className="font-serif text-base text-vintage-espresso">Bilder → Supabase migrieren</h3>
      </div>
      <p className="text-sm text-vintage-dust font-sans">
        Verschiebt lokale <code className="bg-vintage-parchment px-1 text-xs">/uploads</code>-Bilder
        in Supabase Storage (dauerhaft, CDN). Idempotent — beliebig oft ausführbar.
        Voraussetzung: <code className="bg-vintage-parchment px-1 text-xs">SUPABASE_*</code>-ENV gesetzt + Bucket angelegt.
      </p>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => run(true)} disabled={pending}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-sans uppercase tracking-widest border border-vintage-sand text-vintage-ink hover:bg-vintage-parchment transition-colors disabled:opacity-50"
          style={{ borderRadius: "var(--radius-button)" }}>
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Probelauf (dry-run)
        </button>
        <button onClick={() => run(false)} disabled={pending}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-sans uppercase tracking-widest bg-vintage-espresso text-vintage-cream hover:bg-vintage-brown transition-colors disabled:opacity-50"
          style={{ borderRadius: "var(--radius-button)" }}>
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <HardDriveUpload className="w-3.5 h-3.5" />} Jetzt migrieren
        </button>
      </div>

      {res && (
        <div className="flex items-start gap-2 px-3 py-2 bg-vintage-sage/10 border border-vintage-sage/30 text-sm text-vintage-forest"
             style={{ borderRadius: "var(--radius-vintage)" }}>
          <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            {res.dryRun ? "Probelauf: " : "Fertig: "}
            <b>{res.migrated}</b> migriert · {res.skipped} übersprungen · {res.missing} ohne Datei
            {" "}(von {res.total} gesamt)
            {res.missing > 0 && <span className="block mt-1 text-vintage-dust">⚠ {res.missing} Bilder ohne Datei — vermutlich bei früherem Rebuild verloren, bitte neu hochladen.</span>}
          </span>
        </div>
      )}
      {err && (
        <div className="flex items-start gap-2 px-3 py-2 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-sm text-vintage-burgundy"
             style={{ borderRadius: "var(--radius-vintage)" }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> <span>{err}</span>
        </div>
      )}
    </div>
  );
}
