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
      className="px-3 py-2 bg-vintage-cream border border-vintage-sand text-sm font-sans text-vintage-ink focus:outline-none cursor-pointer"
      style={{ borderRadius: "var(--radius-vintage)" }}
    >
      <option value="neu">{labels.neu}</option>
      <option value="preis_asc">{labels.preis_asc}</option>
      <option value="preis_desc">{labels.preis_desc}</option>
      <option value="name">{labels.name}</option>
    </select>
  );
}
