"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { produktNeuAnlegenTgAction } from "../actions";
import { haptic } from "../../fx";

/* ──────────────────────────────────────────────────────────────────────────
 * „+ Новый товар" — legt einen leeren Entwurf an und springt direkt in den
 * Editor (/tg/admin/produkte/[id]). Dort: Foto-Upload, Preis, Beschreibung,
 * dann Publish. Bewusst kein eigenes Formular hier — der Editor kann schon
 * alles (DRY).
 * ────────────────────────────────────────────────────────────────────────── */
export function ProduktNeuButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState<string | null>(null);

  const anlegen = async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    haptic("light");
    const r = await produktNeuAnlegenTgAction();
    if (r.ok) {
      haptic("success");
      router.push(`/tg/admin/produkte/${r.id}`);
    } else {
      haptic("error");
      setErr(r.error);
      setBusy(false);
    }
  };

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={anlegen}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 py-3 text-[12px] uppercase font-medium disabled:opacity-50"
        style={{
          letterSpacing: "0.18em",
          background:    "var(--color-coral)",
          color:         "#fff",
          touchAction:   "manipulation",
        }}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Новый товар
      </button>
      {err && (
        <p className="mt-1.5 text-[11px]" style={{ color: "var(--color-coral-deep, #A53E26)" }}>
          {err}
        </p>
      )}
    </div>
  );
}
