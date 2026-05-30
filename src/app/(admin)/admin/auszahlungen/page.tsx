import { getModuleBase } from "@/lib/module-base-server";
import { alleAuszahlungen, auszahlungsKandidaten } from "@/lib/db/auszahlungen";
import { affiliateEinstellungenLaden } from "@/lib/db/affiliate-settings";
import { formatPreis } from "@/lib/utils/preis";
import { Wallet, CheckCircle2, Clock } from "lucide-react";
import { AuszahlungErstellenButton } from "./auszahlung-erstellen-button";
import { BezahltButton } from "./bezahlt-button";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Выплаты" };
export const dynamic = "force-dynamic";

export default async function AdminAuszahlungenPage() {
  const base = await getModuleBase();
  const settings = await affiliateEinstellungenLaden();
  const [kandidaten, historie] = await Promise.all([
    auszahlungsKandidaten(settings.mindestauszahlung_cent).catch(() => []),
    alleAuszahlungen({ limit: 50 }).catch(() => []),
  ]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso">Выплаты</h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">
            Минимальная сумма: {formatPreis(settings.mindestauszahlung_cent / 100)}
          </p>
        </div>
        <a
          href="/api/admin/auszahlungen/sepa-export?all=true"
          download
          className="flex items-center gap-2 px-4 py-2 border border-vintage-sand text-vintage-brown text-xs font-sans uppercase tracking-widest hover:bg-vintage-parchment transition-colors"
          style={{ borderRadius: "var(--radius-button)" }}
          title="Все открытые SEPA-выплаты XML-файлом (для банковского ПО)"
        >
          📥 Экспорт SEPA-XML
        </a>
      </div>

      {/* Auszahlungs-Kandidaten */}
      <section className="bg-vintage-white border border-vintage-sand p-6" style={{ borderRadius: "var(--radius-card)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg text-vintage-espresso">Готово к выплате</h2>
          <span className="text-xs text-vintage-dust font-sans">{kandidaten.length} партнёров</span>
        </div>
        {kandidaten.length === 0 ? (
          <div className="text-center py-10">
            <Wallet className="w-10 h-10 text-vintage-sand mx-auto mb-3" />
            <p className="text-vintage-dust text-sm font-sans">Ожидающих выплат нет</p>
            <p className="text-xs text-vintage-dust font-sans mt-1">Комиссии должны быть подтверждены и достигнуть минимальной суммы.</p>
          </div>
        ) : (
          <div className="divide-y divide-vintage-sand/40">
            {kandidaten.map(k => (
              <div key={k.affiliate_id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-serif text-vintage-espresso">{k.affiliate_name}</p>
                  <p className="text-xs text-vintage-dust font-sans">
                    {k.affiliate_email} · {k.anzahl_provisionen} комиссий · {k.auszahlungs_methode.toUpperCase()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-serif text-vintage-espresso text-lg">{formatPreis(k.summe_cent / 100)}</p>
                  </div>
                  <AuszahlungErstellenButton
                    affiliateId={k.affiliate_id}
                    methode={k.auszahlungs_methode}
                    summeCent={k.summe_cent}
                    affiliateName={k.affiliate_name}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Historie */}
      <section className="bg-vintage-white border border-vintage-sand p-6" style={{ borderRadius: "var(--radius-card)" }}>
        <h2 className="font-serif text-lg text-vintage-espresso mb-4">История</h2>
        {historie.length === 0 ? (
          <p className="text-vintage-dust text-sm font-sans text-center py-6">Выплат пока нет</p>
        ) : (
          <div className="divide-y divide-vintage-sand/40">
            {historie.map(a => (
              <div key={a.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-serif text-vintage-espresso">{a.affiliate_name}</p>
                  <p className="text-xs text-vintage-dust font-sans flex items-center gap-1">
                    {a.status === "bezahlt"
                      ? <><CheckCircle2 className="w-3 h-3 text-vintage-sage" /> Оплачено {a.bezahlt_am ? new Date(a.bezahlt_am).toLocaleDateString("ru-RU") : ""}</>
                      : <><Clock className="w-3 h-3 text-vintage-gold" /> {new Date(a.erstellt_am).toLocaleDateString("ru-RU")}</>
                    }
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-serif text-vintage-espresso">{formatPreis(a.betrag_cent / 100)}</p>
                    <p className="text-xs text-vintage-dust uppercase tracking-wider">{a.methode}</p>
                  </div>
                  {a.status === "erstellt" && <BezahltButton auszahlungId={a.id} />}
                  {a.status === "bezahlt"  && (
                    <a
                      href={`${base}/auszahlungen/${a.id}/beleg`}
                      target="_blank"
                      className="px-2 py-1 border border-vintage-sand text-vintage-dust text-xs font-sans hover:bg-vintage-parchment transition-colors"
                      style={{ borderRadius: "var(--radius-vintage)" }}
                    >
                      Акт
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
