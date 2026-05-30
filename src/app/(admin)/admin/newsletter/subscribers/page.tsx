import { getModuleBase } from "@/lib/module-base-server";
import Link from "next/link";
import { alleSubscribers } from "@/lib/db/newsletter";
import { SubscriberRow } from "./subscriber-row";
import { Users, ChevronLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Подписчики рассылки" };
export const dynamic = "force-dynamic";

export default async function SubscribersPage({
  searchParams,
}: { searchParams: Promise<{ suche?: string; aktiv?: string }> }) {
  const base = await getModuleBase();
  const sp = await searchParams;
  const daten = await alleSubscribers({
    suche:      sp.suche,
    nur_aktive: sp.aktiv === "1",
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <nav className="flex items-center gap-2 text-xs font-sans text-vintage-dust">
        <Link href={`${base}/newsletter`} className="hover:text-vintage-brown flex items-center gap-1 transition-colors">
          <ChevronLeft className="w-3 h-3" /> Рассылка
        </Link>
      </nav>

      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-vintage-gold" />
        <div>
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso">Подписчики</h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">
            Активны: {daten.aktive} из {daten.gesamt}
          </p>
        </div>
      </div>

      <form method="GET" className="flex gap-2">
        <input name="suche" defaultValue={sp.suche} placeholder="Найти e-mail…"
          className="flex-1 max-w-md px-3 py-2 bg-vintage-cream border border-vintage-sand text-sm font-sans focus:outline-none focus:border-vintage-brown"
          style={{ borderRadius: "var(--radius-vintage)" }} />
        <label className="flex items-center gap-2 cursor-pointer text-sm font-sans text-vintage-brown">
          <input type="checkbox" name="aktiv" value="1" defaultChecked={sp.aktiv === "1"} className="w-4 h-4 accent-vintage-gold" />
          Только активные
        </label>
        <button type="submit" className="px-4 py-2 bg-vintage-espresso text-vintage-cream text-xs uppercase tracking-widest hover:bg-vintage-brown transition-colors" style={{ borderRadius: "var(--radius-button)" }}>Фильтр</button>
      </form>

      {daten.items.length === 0 ? (
        <div className="text-center py-16 bg-vintage-white border border-vintage-sand" style={{ borderRadius: "var(--radius-card)" }}>
          <Users className="w-10 h-10 text-vintage-sand mx-auto mb-3" />
          <p className="font-serif text-vintage-brown">Подписчиков нет</p>
        </div>
      ) : (
        <div className="bg-vintage-white border border-vintage-sand overflow-hidden" style={{ borderRadius: "var(--radius-card)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <thead className="bg-vintage-parchment/50 border-b border-vintage-sand">
                <tr>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">E-Mail</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Имя</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Источник</th>
                  <th className="text-center px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Статус</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">С даты</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-vintage-sand/40">
                {daten.items.map(s => <SubscriberRow key={s.id} subscriber={s} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
