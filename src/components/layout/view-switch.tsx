import { LayoutGrid, Monitor } from "lucide-react";
import { setAdminViewAction } from "@/app/app/view-actions";
import type { AdminView } from "@/lib/admin-view";

/* ──────────────────────────────────────────────────────────────────────────
 * ViewSwitch — App ↔ Klassisch
 *
 * Kleiner Button in der Top-Bar (App-Shell + Admin-Layout). Submit über
 * Server-Action setAdminViewAction → setzt Cookie + redirected zur Home
 * der Zielansicht. Funktioniert ohne Client-JS.
 *
 * `current` ist die JETZT aktive Ansicht; geklickt wird IMMER zur jeweils
 * anderen umgeschaltet.
 * ────────────────────────────────────────────────────────────────────────── */
export function ViewSwitch({
  current,
  compact = false,
}: {
  current: AdminView;
  /** Wenn true → nur Icon, kein Label (für sehr enge Mobile-Top-Bars). */
  compact?: boolean;
}) {
  const target: AdminView = current === "app" ? "classic" : "app";
  const Icon  = target === "app" ? LayoutGrid : Monitor;
  const label = target === "app" ? "Приложение" : "Классика";

  return (
    <form action={setAdminViewAction} className="inline-flex">
      <input type="hidden" name="view" value={target} />
      <button
        type="submit"
        title={`Перейти: ${label}`}
        aria-label={`Перейти: ${label}`}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 transition-colors hover:text-coral"
        style={{
          background:    "transparent",
          border:        "1px solid var(--color-line)",
          color:         "var(--color-ink-soft)",
          letterSpacing: "0.18em",
          fontSize:      10,
          fontWeight:    500,
          textTransform: "uppercase",
          borderRadius:  6,
          touchAction:   "manipulation",
        }}
      >
        <Icon className="w-3.5 h-3.5" />
        {!compact && <span className="hidden sm:inline">{label}</span>}
      </button>
    </form>
  );
}
