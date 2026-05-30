import { getModuleBase } from "@/lib/module-base-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { affiliateById, downlineLaden } from "@/lib/db/affiliates";
import { provisionsSummenFuer } from "@/lib/db/provisionen";
import { klickStatsFuerAffiliate } from "@/lib/db/affiliate-tracking";
import { formatPreis } from "@/lib/utils/preis";
import { ChevronLeft, Mail, Calendar, Coins, Users, MousePointerClick, Hash } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Партнёр: детали" };
export const dynamic = "force-dynamic";

export default async function AffiliateDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const base = await getModuleBase();
  const { id } = await params;
  const [affiliate, summen, klickStats, downline] = await Promise.all([
    affiliateById(id),
    provisionsSummenFuer(id).catch(() => null),
    klickStatsFuerAffiliate(id).catch(() => null),
    downlineLaden(id).catch(() => []),
  ]);

  if (!affiliate) notFound();

  return (
    <div className="space-y-6 max-w-4xl">
      <nav className="flex items-center gap-2 text-xs font-sans text-vintage-dust">
        <Link href={`${base}/affiliates`} className="hover:text-vintage-brown flex items-center gap-1 transition-colors">
          <ChevronLeft className="w-3 h-3" /> Партнёры
        </Link>
        <span>/</span>
        <span className="text-vintage-ink">{affiliate.vorname} {affiliate.nachname}</span>
      </nav>

      {/* Header */}
      <div className="bg-vintage-white border border-vintage-sand p-6" style={{ borderRadius: "var(--radius-card)" }}>
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 bg-vintage-parchment border border-vintage-sand flex items-center justify-center flex-shrink-0" style={{ borderRadius: "var(--radius-card)" }}>
            <span className="text-vintage-brown text-xl font-serif">
              {affiliate.vorname[0]}{affiliate.nachname[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-2xl text-vintage-espresso">
              {affiliate.vorname} {affiliate.nachname}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-vintage-dust font-sans">
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {affiliate.email}</span>
              <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" /> <span className="font-mono text-vintage-gold">{affiliate.referral_code}</span></span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> С нами с {new Date(affiliate.erstellt_am).toLocaleDateString("ru-RU")}</span>
            </div>
            <p className="text-xs text-vintage-dust mt-2 font-sans">
              Статус: <strong className="text-vintage-brown uppercase tracking-wider">{affiliate.status}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Stat-Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox icon={Coins}             label="Открыто"      wert={summen ? formatPreis(summen.offen_cent/100) : "–"} />
        <StatBox icon={Coins}             label="Выплачено"    wert={summen ? formatPreis(summen.ausgezahlt_cent/100) : "–"} />
        <StatBox icon={MousePointerClick} label="Клики (30 д.)" wert={klickStats?.letzte_30 ?? "–"} />
        <StatBox icon={Users}             label="Downline"     wert={downline.length} />
      </div>

      {/* Steuer-Info */}
      <section className="bg-vintage-white border border-vintage-sand p-5" style={{ borderRadius: "var(--radius-card)" }}>
        <h2 className="font-serif text-base text-vintage-espresso mb-3">Налоговый статус</h2>
        <div className="text-sm font-sans text-vintage-brown space-y-1">
          <p>Малый предприниматель (§19 UStG): <strong>{affiliate.ist_kleinunternehmer ? "Да" : "Нет"}</strong></p>
          <p>Бизнес зарегистрирован: <strong>{affiliate.gewerbe_angemeldet ? "Да" : "Нет"}</strong></p>
          <p>Налоговый ID: <strong>{affiliate.steuer_id ?? "–"}</strong></p>
          <p>Способ выплаты: <strong className="uppercase">{affiliate.auszahlungs_methode}</strong></p>
        </div>
      </section>

      {/* Downline */}
      {downline.length > 0 && (
        <section className="bg-vintage-white border border-vintage-sand p-5" style={{ borderRadius: "var(--radius-card)" }}>
          <h2 className="font-serif text-base text-vintage-espresso mb-3">Downline ({downline.length})</h2>
          <div className="divide-y divide-vintage-sand/40">
            {downline.map(d => (
              <Link key={d.id} href={`${base}/affiliates/${d.id}`}
                className="py-2 flex items-center justify-between hover:bg-vintage-parchment/40 -mx-2 px-2 transition-colors">
                <div>
                  <p className="text-sm text-vintage-ink">{d.vorname} {d.nachname}</p>
                  <p className="text-xs text-vintage-dust font-sans">Уровень {d.ebene_relativ} · {d.status}</p>
                </div>
                <span className="font-mono text-xs text-vintage-gold tracking-widest">{d.referral_code}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatBox({ icon: Icon, label, wert }: { icon: React.ElementType; label: string; wert: string | number }) {
  return (
    <div className="bg-vintage-white border border-vintage-sand p-5" style={{ borderRadius: "var(--radius-card)" }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-vintage-gold" />
        <p className="text-xs font-sans uppercase tracking-widest text-vintage-dust">{label}</p>
      </div>
      <p className="font-serif text-xl text-vintage-espresso">{wert}</p>
    </div>
  );
}
