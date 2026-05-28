import Link from "next/link";
import { instagramPostsPublic, instagramKategorienPublic } from "@/lib/db/instagram-archive";
import { InstagramWebClient } from "./instagram-web-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:       "Instagram",
  description: "Кураторский архив постов Galerie du Temps из Instagram — по категориям.",
  alternates:  { canonical: "/instagram" },
};
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /instagram (Web) — öffentliches Instagram-Archiv mit Kategorie-Filter.
 *
 * Gleiche Datenschicht wie die Mini-App (/tg/instagram). Server filtert über
 * ?kat=<slug>; Chips sind Links (kein Client-State nötig). Embeds + Produkt-
 * Links rendert die Client-Komponente.
 * ────────────────────────────────────────────────────────────────────────── */
export default async function InstagramArchivePage({
  searchParams,
}: { searchParams: Promise<{ kat?: string }> }) {
  const sp  = await searchParams;
  const kat = (sp.kat ?? "").trim() || undefined;

  const [posts, kategorien] = await Promise.all([
    instagramPostsPublic({ kategorie: kat }).catch(() => []),
    instagramKategorienPublic().catch(() => []),
  ]);

  const chipHref = (slug: string) => slug ? `/instagram?kat=${encodeURIComponent(slug)}` : "/instagram";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
      <div className="text-center">
        <p className="text-vintage-gold text-xs tracking-widest uppercase mb-3">✦ Из Instagram</p>
        <h1 className="font-serif text-4xl text-vintage-cream">Архив</h1>
      </div>

      {/* Kategorie-Chips (server-rendered Links) */}
      {kategorien.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          <Chip href={chipHref("")} label="Все" aktiv={!kat} />
          {kategorien.map(k => (
            <Chip key={k.slug} href={chipHref(k.slug)} label={`${k.name} · ${k.anzahl ?? 0}`} aktiv={kat === k.slug} />
          ))}
        </div>
      )}

      <InstagramWebClient
        posts={posts.map(p => ({
          id:           p.id,
          permalink:    p.permalink,
          shortcode:    p.shortcode,
          titel:        p.titel,
          produkt_slug: p.produkt_slug ?? null,
          produkt_name: p.produkt_name ?? null,
        }))}
      />
    </div>
  );
}

function Chip({ href, label, aktiv }: { href: string; label: string; aktiv: boolean }) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 font-sans text-xs tracking-widest uppercase transition-colors border ${
        aktiv
          ? "bg-vintage-gold text-vintage-espresso border-vintage-gold"
          : "text-vintage-cream/80 border-vintage-sand/40 hover:border-vintage-gold/60"
      }`}
      style={{ borderRadius: "var(--radius-button)" }}
    >
      {label}
    </Link>
  );
}
