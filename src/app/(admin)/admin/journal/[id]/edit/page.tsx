import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { postById } from "@/lib/db/journal";
import { JournalEditor } from "./journal-editor";
import { ChevronLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Редактировать публикацию" };
export const dynamic = "force-dynamic";

export default async function JournalEditPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Defensive (wie die Journal-Liste): fehlt die Tabelle journal_posts in
  // Produktion (Migration 009 nicht angewendet) ODER ist die DB kurz weg, wirft
  // postById → sonst 500. Dann zurück zur Liste (die den Migrations-Hinweis zeigt).
  let post: Awaited<ReturnType<typeof postById>> = null;
  try {
    post = await postById(id);
  } catch (err) {
    console.error("[admin/journal/edit] postById failed:", err);
    redirect("/admin/journal");
  }
  if (!post) notFound();

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <nav className="flex items-center gap-2 text-xs font-sans text-vintage-dust">
          <Link href="/admin/journal" className="hover:text-vintage-brown flex items-center gap-1 transition-colors">
            <ChevronLeft className="w-3 h-3" /> Journal
          </Link>
          <span>/</span>
          <span className="font-mono text-vintage-gold">{post.slug}</span>
        </nav>
        {post.veroeffentlicht && (
          <a href={`/journal/${post.slug}`} target="_blank"
            className="flex items-center gap-1 text-xs font-sans text-vintage-brown hover:text-vintage-espresso transition-colors">
            Открыть на сайте <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      <JournalEditor post={post} />
    </div>
  );
}
