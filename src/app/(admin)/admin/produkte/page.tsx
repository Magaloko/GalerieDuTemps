import Link from "next/link";
import { produkteListe } from "@/lib/db/produkte";
import { alleKategorien } from "@/lib/db/kategorien";
import { uebersichtStats } from "@/lib/db/statistiken";
import { formatPreis } from "@/lib/utils/preis";
import { ZustandBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QuickToggleRow } from "@/components/produkte/quick-toggle-row";
import { BulkToolbar, BulkCheckbox, BulkSelectAll } from "@/components/produkte/bulk-toolbar";
import {
  Plus,
  Search,
  Pencil,
  Image as ImageIcon,
  Package,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Star,
  ExternalLink,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Товары" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<Record<string, string>>;
}

export default async function ProduktListePage({ searchParams }: Props) {
  const sp       = await searchParams;
  const seite    = parseInt(sp.seite  ?? "1",  10);
  const suche    = sp.suche  ?? "";
  const katId    = sp.kategorie ? parseInt(sp.kategorie, 10) : undefined;
  const zustand  = sp.zustand ?? "";

  const [daten, kategorien, stats] = await Promise.all([
    produkteListe({ seite, suche, kategorie_id: katId, zustand }),
    alleKategorien(),
    uebersichtStats().catch(() => null),
  ]);

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso">Товары</h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">
            Управление ценами, складом и видимостью
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/produkte/schnell"
            className="flex items-center gap-2 px-4 py-2.5 bg-vintage-gold text-vintage-espresso text-xs font-sans tracking-[0.2em] uppercase hover:bg-vintage-amber transition-colors"
            style={{ borderRadius: "var(--radius-button)" }}
            title="Быстрое добавление с помощью ИИ"
          >
            <Sparkles className="w-3.5 h-3.5" /> Быстро + ИИ
          </Link>
          <Link href="/admin/produkte/neu">
            <Button variant="secondary" icon={<Plus className="w-3.5 h-3.5" />}>
              Полная форма
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── KPI-Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-vintage-white border border-vintage-sand p-4" style={{ borderRadius: "var(--radius-card)" }}>
          <p className="text-xs uppercase tracking-widest text-vintage-dust flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" /> Всего товаров
          </p>
          <p className="font-serif text-2xl text-vintage-espresso mt-1">{stats?.produkte_gesamt ?? "—"}</p>
        </div>
        <div className="bg-vintage-sage/10 border border-vintage-sage/30 p-4" style={{ borderRadius: "var(--radius-card)" }}>
          <p className="text-xs uppercase tracking-widest text-vintage-forest flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Активны
          </p>
          <p className="font-serif text-2xl text-vintage-espresso mt-1">{stats?.produkte_verfuegbar ?? "—"}</p>
        </div>
        <div
          className={`p-4 border ${(stats?.produkte_niedrig ?? 0) > 0 ? "bg-vintage-burgundy/10 border-vintage-burgundy/30" : "bg-vintage-white border-vintage-sand"}`}
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <p className="text-xs uppercase tracking-widest text-vintage-dust flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Низкий остаток
          </p>
          <p className="font-serif text-2xl text-vintage-espresso mt-1">{stats?.produkte_niedrig ?? "—"}</p>
          <p className="text-xs text-vintage-dust mt-1">1–5 на складе</p>
        </div>
        <div className="bg-vintage-gold/10 border border-vintage-gold/30 p-4" style={{ borderRadius: "var(--radius-card)" }}>
          <p className="text-xs uppercase tracking-widest text-vintage-brown flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5" /> Избранные
          </p>
          <p className="font-serif text-2xl text-vintage-espresso mt-1">{stats?.produkte_featured ?? "—"}</p>
        </div>
      </div>

      {/* ─── Filter-Leiste ───────────────────────────────────────── */}
      <form method="GET" className="flex flex-wrap gap-3 items-end">
        {/* Suche */}
        <div className="flex-1 min-w-48">
          <label className="text-xs font-sans uppercase tracking-widest text-vintage-brown block mb-1">
            Поиск
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vintage-dust pointer-events-none" />
            <input
              name="suche"
              defaultValue={suche}
              placeholder="Название, slug или артикул …"
              className="
                w-full pl-9 pr-4 py-2.5
                bg-vintage-cream border border-vintage-sand
                text-sm font-sans text-vintage-ink
                focus:outline-none focus:border-vintage-brown
                transition-colors
              "
              style={{ borderRadius: "var(--radius-vintage)" }}
            />
          </div>
        </div>

        {/* Kategorie-Filter */}
        <div className="min-w-40">
          <label className="text-xs font-sans uppercase tracking-widest text-vintage-brown block mb-1">
            Категория
          </label>
          <select
            name="kategorie"
            defaultValue={katId ?? ""}
            className="
              w-full px-3 py-2.5
              bg-vintage-cream border border-vintage-sand
              text-sm font-sans text-vintage-ink
              focus:outline-none focus:border-vintage-brown transition-colors
            "
            style={{ borderRadius: "var(--radius-vintage)" }}
          >
            <option value="">Все</option>
            {kategorien.map(k => (
              <option key={k.id} value={k.id}>{k.name}</option>
            ))}
          </select>
        </div>

        {/* Zustand-Filter */}
        <div className="min-w-36">
          <label className="text-xs font-sans uppercase tracking-widest text-vintage-brown block mb-1">
            Состояние
          </label>
          <select
            name="zustand"
            defaultValue={zustand}
            className="
              w-full px-3 py-2.5
              bg-vintage-cream border border-vintage-sand
              text-sm font-sans text-vintage-ink
              focus:outline-none focus:border-vintage-brown transition-colors
            "
            style={{ borderRadius: "var(--radius-vintage)" }}
          >
            <option value="">Все</option>
            <option value="sehr_gut">Отличное</option>
            <option value="gut">Хорошее</option>
            <option value="akzeptabel">Приемлемое</option>
            <option value="restauriert">Реставрировано</option>
          </select>
        </div>

        <button
          type="submit"
          className="
            px-5 py-2.5 bg-vintage-espresso text-vintage-cream
            text-xs font-sans tracking-widest uppercase
            hover:bg-vintage-brown transition-colors
          "
          style={{ borderRadius: "var(--radius-button)" }}
        >
          Фильтр
        </button>

        {(suche || katId || zustand) && (
          <Link
            href="/admin/produkte"
            className="
              px-4 py-2.5 border border-vintage-sand text-vintage-dust
              text-xs font-sans hover:bg-vintage-parchment transition-colors
            "
            style={{ borderRadius: "var(--radius-button)" }}
          >
            Сбросить
          </Link>
        )}
      </form>

      {/* ─── Bulk-Toolbar (erscheint sticky wenn Auswahl > 0) ──── */}
      <BulkToolbar />

      {/* ─── Tabelle ─────────────────────────────────────────────── */}
      <div
        className="bg-vintage-white border border-vintage-sand overflow-hidden"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        {daten.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="w-12 h-12 text-vintage-sand mb-3" />
            <p className="font-serif text-vintage-brown text-lg">
              Товары не найдены
            </p>
            <p className="text-vintage-dust text-sm font-sans mt-1">
              {suche ? "Измени поисковой запрос или" : "Добавь свой первый товар"}
            </p>
            <Link href="/admin/produkte/neu">
              <Button className="mt-4" size="sm" icon={<Plus className="w-3 h-3" />}>
                Создать товар
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <thead>
                <tr className="border-b border-vintage-sand bg-vintage-parchment/50">
                  <th className="px-3 py-3 w-10">
                    <BulkSelectAll />
                  </th>
                  <th className="text-left px-3 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal w-20">
                    Артикул
                  </th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">
                    Товар
                  </th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal hidden md:table-cell">
                    Категория
                  </th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">
                    Цена
                  </th>
                  <th className="text-center px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal hidden lg:table-cell">
                    Состояние
                  </th>
                  <th className="text-center px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">
                    Статус
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-vintage-sand/40">
                {daten.items.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-vintage-parchment/30 transition-colors"
                  >
                    {/* Bulk-Checkbox */}
                    <td className="px-3 py-3 text-center">
                      <BulkCheckbox id={p.id} />
                    </td>

                    {/* Artikel-Code */}
                    <td className="px-3 py-3 font-mono text-xs text-vintage-dust">
                      {p.artikel_code ?? "—"}
                    </td>

                    {/* Produkt-Name + Thumbnail */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 bg-vintage-parchment border border-vintage-sand flex-shrink-0 overflow-hidden"
                          style={{ borderRadius: "var(--radius-vintage)" }}
                        >
                          {p.hauptbild_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.hauptbild_url}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-vintage-sand" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-vintage-ink font-sans text-sm truncate max-w-52">
                            {p.name}
                          </p>
                          <p className="text-xs text-vintage-dust font-mono truncate max-w-52">
                            {p.slug}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Kategorie */}
                    <td className="px-4 py-3 text-vintage-dust hidden md:table-cell">
                      {p.kategorie_name ?? "–"}
                    </td>

                    {/* Preis */}
                    <td className="px-4 py-3 text-right">
                      <p className="font-serif text-vintage-espresso">
                        {formatPreis(p.preis)}
                      </p>
                      {p.originalpreis && (
                        <p className="text-vintage-dust text-xs line-through">
                          {formatPreis(p.originalpreis)}
                        </p>
                      )}
                    </td>

                    {/* Zustand */}
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <ZustandBadge zustand={p.zustand} />
                    </td>

                    {/* Status — inline interaktiv */}
                    <td className="px-4 py-3 text-center">
                      <QuickToggleRow
                        id={p.id}
                        aktiv={p.aktiv}
                        featured={p.featured}
                        verkauft={p.verkauft}
                        lagerbestand={p.lagerbestand}
                      />
                    </td>

                    {/* Aktionen */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <a
                          href={`/katalog/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-vintage-dust hover:text-vintage-brown hover:bg-vintage-parchment transition-colors"
                          style={{ borderRadius: "var(--radius-vintage)" }}
                          title="Посмотреть в магазине"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <Link
                          href={`/admin/produkte/${p.id}/bilder`}
                          className="p-2 text-vintage-dust hover:text-vintage-brown hover:bg-vintage-parchment transition-colors"
                          style={{ borderRadius: "var(--radius-vintage)" }}
                          title="Управление изображениями"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/admin/produkte/${p.id}`}
                          className="p-2 text-vintage-dust hover:text-vintage-brown hover:bg-vintage-parchment transition-colors"
                          style={{ borderRadius: "var(--radius-vintage)" }}
                          title="Редактировать"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Paginierung ─────────────────────────────────────────── */}
      {daten.seiten > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-vintage-dust font-sans">
            Страница {daten.seite} из {daten.seiten} ·{" "}
            {daten.gesamt} товаров
          </p>
          <div className="flex gap-2">
            {daten.seite > 1 && (
              <Link
                href={`/admin/produkte?seite=${daten.seite - 1}${suche ? `&suche=${suche}` : ""}`}
                className="
                  flex items-center gap-1 px-3 py-2
                  border border-vintage-sand text-vintage-brown
                  text-xs font-sans hover:bg-vintage-parchment transition-colors
                "
                style={{ borderRadius: "var(--radius-button)" }}
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Zurück
              </Link>
            )}
            {daten.seite < daten.seiten && (
              <Link
                href={`/admin/produkte?seite=${daten.seite + 1}${suche ? `&suche=${suche}` : ""}`}
                className="
                  flex items-center gap-1 px-3 py-2
                  border border-vintage-sand text-vintage-brown
                  text-xs font-sans hover:bg-vintage-parchment transition-colors
                "
                style={{ borderRadius: "var(--radius-button)" }}
              >
                Weiter <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
