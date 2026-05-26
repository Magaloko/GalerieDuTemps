"use client";

import { useRouter } from "next/navigation";

export function SortSelect({
  current,
  baseQuery,
  labels,
}: {
  current: string;
  /** Aktuelle Query-Params (ohne sortierung + seite) */
  baseQuery: Record<string, string>;
  labels: { neu: string; preis_asc: string; preis_desc: string; name: string };
}) {
  const router = useRouter();
  return (
    <select
      defaultValue={current}
      onChange={(e) => {
        const qs = new URLSearchParams({ ...baseQuery, sortierung: e.target.value, seite: "1" });
        router.push(`/katalog?${qs}`);
      }}
      className="px-4 py-2 text-[11px] uppercase font-medium focus:outline-none cursor-pointer"
      style={{
        letterSpacing: "0.22em",
        background:    "transparent",
        color:         "var(--color-ink)",
        border:        "1px solid var(--color-line)",
        borderRadius:  0,
      }}
    >
      <option value="neu">{labels.neu}</option>
      <option value="preis_asc">{labels.preis_asc}</option>
      <option value="preis_desc">{labels.preis_desc}</option>
      <option value="name">{labels.name}</option>
    </select>
  );
}
