import { notFound } from "next/navigation";
import Link from "next/link";
import {
  leadById, leadMessages, leadOriginalNachricht, adminBenutzerListe,
} from "@/lib/db/leads";
import { LeadDetailClient } from "./client";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const l = await leadById(id);
  return { title: l ? `Лид: ${l.kontakt_name ?? l.kontakt_email ?? id}` : "Лид не найден" };
}

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;
  const [lead, messages, originalText, admins] = await Promise.all([
    leadById(id),
    leadMessages(id),
    leadOriginalNachricht(id),
    adminBenutzerListe(),
  ]);

  if (!lead) notFound();

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-2 text-xs font-sans text-vintage-dust">
        <Link href="/admin/leads" className="hover:text-vintage-brown transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Входящие
        </Link>
        <span>/</span>
        <span className="text-vintage-ink truncate max-w-48">
          {lead.kontakt_name ?? lead.kontakt_email ?? lead.kontakt_handle ?? lead.id.slice(0,8)}
        </span>
      </div>

      <LeadDetailClient
        lead={lead}
        messages={messages}
        originalText={originalText}
        admins={admins}
      />
    </div>
  );
}
