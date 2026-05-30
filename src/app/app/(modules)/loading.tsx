import { ModulListeSkeleton } from "../_skeletons";

/**
 * (modules)/loading.tsx — deckt ALLE Modul-Listen-Seiten ab (bestellungen,
 * kunden, leads, rechnungen, produkte, …). Next.js zeigt diesen Skeleton beim
 * ersten Navigations-Render, bis die Server-Komponente gestreamt ist.
 * Kein Layout-Shift dank passender Abmaße (KPI-Grid + Filter + Tabelle).
 */
export default function Loading() { return <ModulListeSkeleton />; }
