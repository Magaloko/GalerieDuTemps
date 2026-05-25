import Link from "next/link";
import { allePostsAdmin } from "@/lib/db/journal";
import { JournalNeuFormular } from "./journal-neu-formular";
import { BookOpen, ExternalLink, CheckCircle2, Edit } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Journal" };
export const dynamic = "force-dynamic";

export default async function JournalAdminPage() {
  const posts = await allePostsAdmin();

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-vintage-gold" />
        <div>
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso">Journal</h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">{posts.length} Beiträge</p>
        </div>
      </div>

      <JournalNeuFormular />

      {posts.length === 0 ? (
        <div className="text-center py-12 bg-vintage-white border border-vintage-sand" style={{ borderRadius: "var(--radius-card)" }}>
          <BookOpen className="w-10 h-10 text-vintage-sand mx-auto mb-3" />
          <p className="font-serif text-vintage-brown">Noch keine Beiträge</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map(p => (
            <Link key={p.id} href={`/admin/journal/${p.id}/edit`}
              className="flex items-center gap-4 p-4 bg-vintage-white border border-vintage-sand hover:border-vintage-brown transition-colors"
              style={{ borderRadius: "var(--radius-card)" }}>
              {p.cover_bild_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_bild_url} alt="" className="w-14 h-14 object-cover bg-vintage-parchment flex-shrink-0" style={{ borderRadius: "var(--radius-vintage)" }} />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-serif text-vintage-espresso truncate">{p.titel}</p>
                  {p.veroeffentlicht ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-vintage-sage/10 text-vintage-sage" style={{ borderRadius: "var(--radius-vintage)" }}>
                      <CheckCircle2 className="w-3 h-3" /> Live
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs bg-vintage-dust/10 text-vintage-dust" style={{ borderRadius: "var(--radius-vintage)" }}>Entwurf</span>
                  )}
                </div>
                <p className="text-xs text-vintage-dust font-sans mt-0.5 font-mono">/{p.slug}</p>
              </div>
              <Edit className="w-4 h-4 text-vintage-dust" />
              {p.veroeffentlicht && (
                <a href={`/journal/${p.slug}`} target="_blank" onClick={e => e.stopPropagation()} className="text-vintage-dust hover:text-vintage-brown">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
