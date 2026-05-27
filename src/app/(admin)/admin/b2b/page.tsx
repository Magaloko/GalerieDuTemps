import Link from "next/link";
import { b2bAntraegeListe } from "@/lib/db/customer-b2b";
import { B2bAntragZeile } from "./b2b-antrag-zeile";
import { Briefcase, Inbox } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "B2B-заявки" };
export const dynamic = "force-dynamic";

const FILTER = [
  { value: "",         label: "Все"          },
  { value: "pending",  label: "Ожидает"      },
  { value: "verified", label: "Подтверждён"  },
  { value: "rejected", label: "Отклонён"     },
];

export default async function B2bAdminPage({
  searchParams,
}: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = (sp.status as "pending" | "verified" | "rejected" | undefined) ?? "";
  const antraege = await b2bAntraegeListe(status);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Briefcase className="w-5 h-5 text-vintage-gold" />
        <div>
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso">B2B-заявки</h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">Записей: {antraege.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-vintage-sand pb-1">
        {FILTER.map(f => (
          <Link key={f.value}
            href={f.value ? `/admin/b2b?status=${f.value}` : "/admin/b2b"}
            className={`px-4 py-2 text-xs font-sans uppercase tracking-widest transition-colors ${
              status === f.value ? "bg-vintage-espresso text-vintage-cream" : "text-vintage-dust hover:bg-vintage-parchment hover:text-vintage-brown"
            }`}
            style={{ borderRadius: "var(--radius-button)" }}>
            {f.label}
          </Link>
        ))}
      </div>

      {antraege.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-vintage-white border border-vintage-sand" style={{ borderRadius: "var(--radius-card)" }}>
          <Inbox className="w-10 h-10 text-vintage-sand mb-3" />
          <p className="font-serif text-lg text-vintage-brown">Заявок нет</p>
        </div>
      ) : (
        <div className="space-y-3">
          {antraege.map(a => <B2bAntragZeile key={a.id} antrag={a} />)}
        </div>
      )}
    </div>
  );
}
