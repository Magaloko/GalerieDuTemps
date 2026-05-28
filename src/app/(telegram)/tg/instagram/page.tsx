import { TelegramAuthGate } from "../auth-gate";
import { instagramPostsPublic, instagramKategorienPublic } from "@/lib/db/instagram-archive";
import { InstagramArchiveClient } from "./instagram-archive-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:  "Instagram · Galerie du Temps",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /tg/instagram — öffentliches Instagram-Archiv (Lazy-Feed mit Kategorie-Filter).
 *
 * Server liest ?kat=<slug>, lädt aktive Posts + Kategorien (mit Count) und
 * reicht sie an den Client. Embeds werden client-seitig lazy gerendert.
 * ────────────────────────────────────────────────────────────────────────── */
export default async function TgInstagramArchivePage({
  searchParams,
}: { searchParams: Promise<{ kat?: string }> }) {
  const sp  = await searchParams;
  const kat = (sp.kat ?? "").trim() || undefined;

  const [posts, kategorien] = await Promise.all([
    instagramPostsPublic({ kategorie: kat }).catch(() => []),
    instagramKategorienPublic().catch(() => []),
  ]);

  return (
    <TelegramAuthGate>
      <InstagramArchiveClient
        posts={posts.map(p => ({
          id:             p.id,
          permalink:      p.permalink,
          shortcode:      p.shortcode,
          typ:            p.typ,
          titel:          p.titel,
          kategorie_name: p.kategorie_name ?? null,
          produkt_slug:   p.produkt_slug ?? null,
          produkt_name:   p.produkt_name ?? null,
        }))}
        kategorien={kategorien.map(k => ({ slug: k.slug, name: k.name, anzahl: k.anzahl ?? 0 }))}
        aktiveKategorie={kat ?? ""}
      />
    </TelegramAuthGate>
  );
}
