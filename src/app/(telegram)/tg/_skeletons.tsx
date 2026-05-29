/* ──────────────────────────────────────────────────────────────────────────
 * Mini-App Skeletons — Sofort-Feedback bei Navigation (Next loading.tsx).
 *
 * Server-Komponenten (kein State). Nutzen Tailwind `animate-pulse` + die
 * TG-Theme-Section-Farbe, damit es hell/dunkel passt. Kein Layout-Shift:
 * Maße spiegeln die echten Seiten grob.
 * ────────────────────────────────────────────────────────────────────────── */

const BLOCK = "var(--tg-theme-section-bg-color, rgba(0,0,0,0.06))";

function Box({ h, w = "100%", r = 8, mb = 0 }: { h: number | string; w?: number | string; r?: number; mb?: number }) {
  return (
    <div
      className="animate-pulse"
      style={{ height: h, width: w, borderRadius: r, marginBottom: mb, background: BLOCK }}
    />
  );
}

/** Katalog-Grid (2 Spalten Produktkarten). */
export function CatalogSkeleton() {
  return (
    <main className="p-4">
      <Box h={14} w={90} mb={6} />
      <Box h={26} w={160} mb={18} />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <Box h={170} r={10} mb={8} />
            <Box h={13} w="80%" mb={6} />
            <Box h={13} w="45%" />
          </div>
        ))}
      </div>
    </main>
  );
}

/** Produktdetail (großes Bild + Titel + Preis + Buttons). */
export function ProductSkeleton() {
  return (
    <main className="pb-10">
      <Box h={360} r={0} mb={16} />
      <div className="px-4">
        <Box h={12} w={70} mb={10} />
        <Box h={26} w="75%" mb={14} />
        <Box h={30} w={130} mb={18} />
        <Box h={48} r={6} mb={10} />
        <Box h={48} r={6} mb={20} />
        <Box h={13} w="100%" mb={8} />
        <Box h={13} w="92%" mb={8} />
        <Box h={13} w="60%" />
      </div>
    </main>
  );
}

/** Listen-Seite (Bestellungen / Wunschliste). */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <main className="p-4">
      <Box h={14} w={80} mb={6} />
      <Box h={26} w={150} mb={18} />
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Box h={56} w={56} r={8} />
            <div className="flex-1">
              <Box h={14} w="70%" mb={8} />
              <Box h={12} w="40%" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
