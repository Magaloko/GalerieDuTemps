import { getModuleBase } from "@/lib/module-base-server";
import Link from "next/link";
import { alleKategorienAdmin } from "@/lib/db/kategorien";
import { KategorieVerwaltung, type KatRow } from "@/components/kategorien/kategorie-verwaltung";
import { Button } from "@/components/ui/button";
import { Plus, Tag } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Категории" };
export const dynamic = "force-dynamic";

export default async function KategorienListePage() {
  const base = await getModuleBase();
  const kategorien = await alleKategorienAdmin();

  const rows: KatRow[] = kategorien.map(k => ({
    id:         k.id,
    name:       k.name,
    slug:       k.slug,
    code:       k.code ?? null,
    eltern_id:  k.eltern_id ?? null,
    sortierung: k.sortierung ?? 0,
    aktiv:      k.aktiv,
    anzahl:     k.anzahl ?? 0,
  }));

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso">Категории</h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">
            Всего: {kategorien.length} · перетаскивайте для порядка, группируйте через список «родитель»
          </p>
        </div>
        <Link href={`${base}/kategorien/neu`}>
          <Button icon={<Plus className="w-3.5 h-3.5" />}>Новая категория</Button>
        </Link>
      </div>

      {rows.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 text-center bg-vintage-white border border-vintage-sand"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <Tag className="w-12 h-12 text-vintage-sand mb-3" />
          <p className="font-serif text-vintage-brown text-lg">Категорий пока нет</p>
          <Link href={`${base}/kategorien/neu`}>
            <Button className="mt-4" size="sm" icon={<Plus className="w-3 h-3" />}>
              Создать первую категорию
            </Button>
          </Link>
        </div>
      ) : (
        <KategorieVerwaltung initial={rows} base={base} />
      )}
    </div>
  );
}
