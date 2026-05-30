import { getModuleBase } from "@/lib/module-base-server";
import Link from "next/link";
import Image from "next/image";
import { Tag, ExternalLink, EyeOff } from "lucide-react";
import { brandsAlle } from "@/lib/db/brands";
import { NewBrandForm } from "./new-brand-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Бренды" };
export const dynamic = "force-dynamic";

export default async function BrandsAdminPage() {
  const base = await getModuleBase();
  const brands = await brandsAlle();

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2">
        <Tag className="w-5 h-5 text-vintage-gold" />
        <div>
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso">Бренды</h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">{brands.length} брендов · страница на каждый бренд</p>
        </div>
      </div>

      <NewBrandForm />

      {brands.length === 0 ? (
        <div className="text-center py-12 bg-vintage-white border border-vintage-sand" style={{ borderRadius: "var(--radius-card)" }}>
          <Tag className="w-10 h-10 text-vintage-sand mx-auto mb-3" />
          <p className="font-serif text-vintage-brown">Брендов пока нет</p>
        </div>
      ) : (
        <div className="space-y-2">
          {brands.map((b) => (
            <Link
              key={b.id}
              href={`${base}/brands/${b.id}`}
              className="flex items-center gap-4 p-4 bg-vintage-white border border-vintage-sand hover:border-vintage-brown transition-colors"
              style={{ borderRadius: "var(--radius-card)" }}
            >
              <div className="relative w-12 h-12 shrink-0 overflow-hidden border border-vintage-sand bg-vintage-parchment flex items-center justify-center" style={{ borderRadius: "var(--radius-vintage)" }}>
                {b.logo_url ? (
                  <Image src={b.logo_url} alt={b.name} fill sizes="48px" className="object-contain" />
                ) : (
                  <Tag className="w-5 h-5 text-vintage-sand" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-serif text-vintage-espresso truncate">{b.name}</p>
                  {!b.aktiv && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-vintage-dust bg-vintage-dust/10" style={{ borderRadius: "var(--radius-vintage)" }}>
                      <EyeOff className="w-3 h-3" /> Скрыт
                    </span>
                  )}
                </div>
                <p className="text-xs text-vintage-dust font-sans mt-0.5">/brand/{b.slug}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-vintage-dust shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
