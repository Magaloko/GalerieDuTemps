import { notFound } from "next/navigation";
import Link from "next/link";
import { newsletterById } from "@/lib/db/newsletter";
import { alleSegments } from "@/lib/db/crm";
import { NewsletterEditor } from "./newsletter-editor";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Newsletter bearbeiten" };
export const dynamic = "force-dynamic";

export default async function NewsletterEditPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [n, segments] = await Promise.all([newsletterById(id), alleSegments()]);
  if (!n) notFound();

  return (
    <div className="space-y-6 max-w-5xl">
      <nav className="flex items-center gap-2 text-xs font-sans text-vintage-dust">
        <Link href="/admin/newsletter" className="hover:text-vintage-brown flex items-center gap-1 transition-colors">
          <ChevronLeft className="w-3 h-3" /> Newsletter
        </Link>
        <span>/</span>
        <span className="text-vintage-ink truncate max-w-72">{n.titel}</span>
      </nav>

      <NewsletterEditor newsletter={n} segments={segments} />
    </div>
  );
}
