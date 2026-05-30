import { getModuleBase } from "@/lib/module-base-server";
import Link from "next/link";
import { produkteListe } from "@/lib/db/produkte";
import { alleKategorien } from "@/lib/db/kategorien";
import { Package, Plus, Search, Inbox, Sparkles, Eye, EyeOff, ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import { QuickToggleRow } from "@/components/produkte/quick-toggle-row";
import type { ProduktListItem } from "@/types/produkt";

export const metadata: Metadata = { title: "Товары" };
export const dynamic = "force-dynamic";

const ZUSTAND_LABEL: Record<string, string> = {
  neu: "Новое", sehr_gut: "Очень хорошее", gut: "Хорошее", akzeptabel: "Приемлемое",
};

export default async function ProdukteAdminPage({
  searchParams,
}: { searchParams: Promise<Record<string, string>> }) {
  const base = await getModuleBase();
  const sp = await searchParams;
  const suche      = sp.suche ?? "";
  const kategorie  = sp.kategorie ?? "";
  const zustand    = sp.zustand ?? "";
  const seite      = parseInt(sp.seite ?? "1", 10);

  const [daten, kategorien] = await Promise.all([
    produkteListe({ suche, kategorie, zustand, seite, limit: 50 }),
    alleKategorien(),
  ]);

  const niedrig = daten.items.filter(p => p.lagerbestand > 0 && p.lagerbestand <= 5).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="eyebrow">✦ Товары</p>
          <h1 className="list-title">Товары</h1>
          <p className="list-sub">Управление ценами, складом и видимостью</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`${base}/produkte/entwuerfe`} className="btn-line">
            <Inbox className="w-3.5 h-3.5" /> Черновики
          </Link>
          <Link href={`${base}/produkte/schnell`} className="btn-coral btn-coral-sm">
            <Sparkles className="w-3.5 h-3.5" /> Быстро + ИИ
          </Link>
          <Link href={`${base}/produkte/neu`} className="btn-line">
            <Plus className="w-3.5 h-3.5" /> Полная форма
          </Link>
        </div>
      </div>

      {/* KPI-Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="kpi">
          <p className="kpi-label"><Package className="w-3.5 h-3.5" /> Всего товаров</p>
          <p className="kpi-value">{daten.gesamt}</p>
        </div>
        <div className="kpi">
          <p className="kpi-label"><Eye className="w-3.5 h-3.5" /> Активны</p>
          <p className="kpi-value">{daten.items.filter(p => p.aktiv).length}</p>
        </div>
        <div className={`kpi${niedrig > 0 ? " kpi-accent" : ""}`}>
          <p className="kpi-label"><EyeOff className="w-3.5 h-3.5" /> Низкий остаток</p>
          <p className="kpi-value">{niedrig}</p>
          <p className="list-sub">1–5 на складе</p>
        </div>
        <div className="kpi">
          <p className="kpi-label"><Sparkles className="w-3.5 h-3.5" /> Избранные</p>
          <p className="kpi-value">{daten.items.filter(p => p.featured).length}</p>
        </div>
      </div>

      {/* Such-/Filterleiste */}
      <form method="GET" className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-48">
          <label className="field-label block mb-1.5">Поиск</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--color-ink-mute)" }} />
            <input name="suche" defaultValue={suche} placeholder="Название, slug или артикул ..." className="field-input pl-9" />
          </div>
        </div>
        <div>
          <label className="field-label block mb-1.5">Категория</label>
          <select name="kategorie" defaultValue={kategorie} className="field-input">
            <option value="">Все</option>
            {kategorien.map(k => <option key={k.id} value={k.slug}>{k.name}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label block mb-1.5">Состояние</label>
          <select name="zustand" defaultValue={zustand} className="field-input">
            <option value="">Все</option>
            {Object.entries(ZUSTAND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button type="submit" className="btn-coral btn-coral-sm">Фильтр</button>
      </form>

      {daten.items.length === 0 ? (
        <div className="empty-state">
          <Package className="w-10 h-10 opacity-40" />
          <p className="empty-state-title">Товары не найдены</p>
          <p className="text-sm mt-1">Измените фильтры или добавьте товар.</p>
        </div>
      ) : (
        <div className="data-table-wrap">
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Товар</th>
                  <th className="hidden md:table-cell">Артикул</th>
                  <th className="hidden lg:table-cell">Категория</th>
                  <th className="num">Цена</th>
                  <th className="num">Действия</th>
                </tr>
              </thead>
              <tbody>
                {daten.items.map((p: ProduktListItem) => (
                  <QuickToggleRow key={p.id} produkt={p} base={base} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {daten.seiten > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="list-sub">Страница {daten.seite} из {daten.seiten}</p>
          <div className="flex gap-2">
            {daten.seite > 1 && (
              <Link href={`${base}/produkte?seite=${daten.seite - 1}${suche ? `&suche=${suche}` : ""}`} className="btn-line">
                <ChevronLeft className="w-3.5 h-3.5" /> Назад
              </Link>
            )}
            {daten.seite < daten.seiten && (
              <Link href={`${base}/produkte?seite=${daten.seite + 1}${suche ? `&suche=${suche}` : ""}`} className="btn-line">
                Вперёд <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
