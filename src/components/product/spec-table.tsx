type Row = { label: string; value: React.ReactNode };

type SpecTableProps = {
  rows:      Row[];
  className?: string;
};

/* ──────────────────────────────────────────────────────────────────────────
 * SpecTable — Handoff C1 Product-Attribution-Tabelle.
 * Plain <table>, jede Row mit border-bottom: 1px line.
 * Label-Spalte: uppercase 11/0.16em, ink-mute, 130px breit.
 * Value-Spalte: italic 13.
 * ────────────────────────────────────────────────────────────────────────── */
export function SpecTable({ rows, className }: SpecTableProps) {
  const filtered = rows.filter(r => r.value);
  if (filtered.length === 0) return null;
  return (
    <table className={`w-full ${className ?? ""}`} style={{ borderCollapse: "collapse" }}>
      <tbody>
        {filtered.map((r, i) => (
          <tr key={i}>
            <th
              className="text-left align-top py-3.5 pr-4 text-[11px] uppercase font-medium"
              style={{
                letterSpacing: "0.16em",
                color:         "var(--color-ink-mute)",
                width:         130,
                borderBottom:  "1px solid var(--color-line)",
                fontWeight:    500,
              }}
            >
              {r.label}
            </th>
            <td
              className="py-3.5 text-[13px]"
              style={{
                fontFamily:   "var(--font-italic)",
                fontStyle:    "italic",
                color:        "var(--color-ink)",
                borderBottom: "1px solid var(--color-line)",
              }}
            >
              {r.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
