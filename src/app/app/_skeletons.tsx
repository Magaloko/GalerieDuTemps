/* ──────────────────────────────────────────────────────────────────────────
 * /app Skeleton-Shapes — Sofort-Feedback (Next.js loading.tsx, server-only).
 *
 * Nutzt .animate-pulse-soft (globals.css, 1,4 s sanft) + var(--color-paper-warm)
 * als Block-Farbe — sichtbar auf Paper-Hintergrund, unsichtbar auf Cobalt.
 * Maße spiegeln die echten Layouts, damit kein Layout-Shift beim Laden.
 * ────────────────────────────────────────────────────────────────────────── */

const BG  = "var(--color-paper-warm)";
const R4  = "var(--radius-card)";

function Box({
  h, w = "100%", radius = R4, className = "",
  style,
}: {
  h: number | string;
  w?: number | string;
  radius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`animate-pulse-soft ${className}`}
      style={{ height: h, width: w, borderRadius: radius, background: BG, ...style }}
    />
  );
}

/* ─ KPI-Card-Gruppe (2×2 auf Mobile, 4er-Reihe ab lg) ─────────────────── */
function KpiGrid({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-${count} gap-3`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="app-card p-4 space-y-2">
          <Box h={10} w="60%" radius={3} />
          <Box h={26} w="45%" radius={3} />
        </div>
      ))}
    </div>
  );
}

/* ─ Filter-Leiste ──────────────────────────────────────────────────────── */
function FilterBar() {
  return (
    <div className="flex gap-3 flex-wrap">
      <Box h={36} w="240px" radius={3} />
      <Box h={36} w="140px" radius={3} />
      <Box h={36} w="80px"  radius={3} />
    </div>
  );
}

/* ─ Daten-Tabelle (Kopfzeile + Zeilen) ──────────────────────────────────── */
function TableRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="data-table-wrap">
      {/* Thead-Imitat */}
      <div className="flex gap-4 px-4 py-3" style={{ borderBottom: "1px solid var(--color-line)", background: "var(--color-paper-warm)" }}>
        <Box h={10} w="30%" radius={3} />
        <Box h={10} w="20%" radius={3} />
        <Box h={10} w="20%" radius={3} />
        <Box h={10} w="15%" radius={3} />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5" style={{ borderBottom: "1px solid var(--color-line)" }}>
          <Box h={36} w={36} radius={4} className="flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Box h={12} w="60%" radius={3} />
            <Box h={10} w="40%" radius={3} />
          </div>
          <Box h={10} w="10%" radius={3} />
          <Box h={22} w={60}  radius={3} />
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   EXPORTS: vollständige Seiten-Skeletons
   ══════════════════════════════════════════════════════════════════════════ */

/** Сегодня-Dashboard: KPI × 4 + 2 Aktions-Buttons + Feed-Liste */
export function TodaySkeleton() {
  return (
    <div className="px-4 py-5 space-y-5">
      {/* Header */}
      <div className="space-y-1.5">
        <Box h={9} w={120} radius={3} />
        <Box h={26} w={160} radius={3} />
      </div>
      {/* KPIs */}
      <KpiGrid count={4} />
      {/* Aktions-Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <Box h={52} radius={10} />
        <Box h={52} radius={10} />
      </div>
      {/* Feed */}
      <div className="app-card p-4 space-y-3">
        <Box h={11} w={140} radius={3} />
        {[80, 65, 90, 55, 75].map((w, i) => (
          <div key={i} className="flex items-center gap-3">
            <Box h={8} w={8} radius="50%" className="flex-shrink-0" />
            <Box h={11} w={`${w}%`} radius={3} />
            <Box h={11} w={28} radius={3} className="flex-shrink-0 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Menü-Kacheln: Gruppen-Überschrift + 3-spaltige Kacheln */
export function MenuSkeleton() {
  return (
    <div className="px-4 py-4 space-y-6">
      {[4, 3, 2, 6, 3, 2].map((count, gi) => (
        <div key={gi} className="space-y-3">
          <Box h={10} w={80} radius={3} />
          <ul className="grid grid-cols-3 gap-3">
            {Array.from({ length: count }).map((_, i) => (
              <li key={i} className="flex flex-col items-center gap-2">
                <Box h={0} w="100%" radius={14} style={{ height: undefined, aspectRatio: "1" }} />
                <Box h={11} w="70%" radius={3} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Modul-Liste (bestellungen / kunden / leads / …): KPI-Grid + Filter + Tabelle */
export function ModulListeSkeleton({ kpis = 4 }: { kpis?: number }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Box h={9} w={100} radius={3} />
          <Box h={26} w={180} radius={3} />
          <Box h={10} w={120} radius={3} />
        </div>
        <Box h={34} w={120} radius={3} />
      </div>
      {/* KPIs */}
      <KpiGrid count={kpis} />
      {/* Filter */}
      <FilterBar />
      {/* Tabelle */}
      <TableRows rows={6} />
    </div>
  );
}

/** Detail-Seite (bestellungen/[id], kunden/[id], leads/[id]): Zweispalter */
export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Box h={10} w={60} radius={3} />
        <Box h={10} w={8}  radius={3} />
        <Box h={10} w={80} radius={3} />
      </div>
      {/* Zweispalter */}
      <div className="record-layout">
        {/* Hauptspalte */}
        <div className="record-main space-y-5">
          <div className="record-card space-y-4">
            <Box h={16} w={120} radius={3} />
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 py-2" style={{ borderTop: "1px solid var(--color-line)" }}>
                <Box h={40} w={40} radius={4} className="flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Box h={12} w="65%" radius={3} />
                  <Box h={10} w="40%" radius={3} />
                </div>
                <Box h={14} w={80} radius={3} />
              </div>
            ))}
          </div>
        </div>
        {/* Aside */}
        <aside className="record-aside space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="record-card space-y-3">
              <Box h={14} w={100} radius={3} />
              {[3, 4].map(j => (
                <div key={j} className="space-y-1">
                  <Box h={9} w="40%" radius={3} />
                  <Box h={13} w="75%" radius={3} />
                </div>
              ))}
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
