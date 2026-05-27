import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";
import { ManuellBestellungClient } from "./client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Новый заказ" };

export default function NeueBestellungPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2 text-xs font-sans text-vintage-dust">
        <Link href="/admin/bestellungen" className="hover:text-vintage-brown transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Заказы
        </Link>
        <span>/</span>
        <span className="text-vintage-ink">Новый (вручную)</span>
      </div>

      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-2xl text-vintage-espresso flex items-center gap-2">
          <FileText className="w-5 h-5 text-vintage-gold" /> Создать заказ вручную
        </h1>
        <p className="text-vintage-dust text-xs font-sans mt-0.5">
          Для заказов по телефону, покупок на месте или случаев, когда клиент оформил заказ не через сайт.
          Остаток резервируется сразу, НДС 12 % рассчитывается автоматически.
        </p>
      </div>

      <ManuellBestellungClient />
    </div>
  );
}
