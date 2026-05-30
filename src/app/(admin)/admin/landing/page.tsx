import { getModuleBase } from "@/lib/module-base-server";
import Link from "next/link";
import { LayoutTemplate, ExternalLink, Home } from "lucide-react";
import { landingPagesAlle } from "@/lib/db/landing-pages";
import { NewLandingForm } from "./new-landing-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pages" };
export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  entwurf:         "text-vintage-dust     bg-vintage-dust/10",
  veroeffentlicht: "text-vintage-sage     bg-vintage-sage/10",
  archiviert:      "text-vintage-burgundy bg-vintage-burgundy/10",
};

const STATUS_LABEL: Record<string, string> = {
  entwurf:         "Черновик",
  veroeffentlicht: "Опубликовано",
  archiviert:      "В архиве",
};

export default async function LandingAdminPage() {
  const base = await getModuleBase();
  const pages = await landingPagesAlle();

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2">
        <LayoutTemplate className="w-5 h-5 text-vintage-gold" />
        <div>
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso">Pages</h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">{pages.length} страниц · по странице на бренд</p>
        </div>
      </div>

      <NewLandingForm />

      {pages.length === 0 ? (
        <div className="text-center py-12 bg-vintage-white border border-vintage-sand" style={{ borderRadius: "var(--radius-card)" }}>
          <LayoutTemplate className="w-10 h-10 text-vintage-sand mx-auto mb-3" />
          <p className="font-serif text-vintage-brown">Страниц пока нет</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pages.map((p) => (
            <Link
              key={p.id}
              href={`${base}/landing/${p.id}`}
              className="flex items-center justify-between p-4 bg-vintage-white border border-vintage-sand hover:border-vintage-brown transition-colors"
              style={{ borderRadius: "var(--radius-card)" }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-serif text-vintage-espresso truncate">{p.titel}</p>
                  <span className={`px-2 py-0.5 text-xs ${STATUS_STYLE[p.status]}`} style={{ borderRadius: "var(--radius-vintage)" }}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                  {p.ist_startseite && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-vintage-gold bg-vintage-gold/10" style={{ borderRadius: "var(--radius-vintage)" }}>
                      <Home className="w-3 h-3" /> Главная
                    </span>
                  )}
                </div>
                <p className="text-xs text-vintage-dust font-sans mt-0.5">/lp/{p.slug} · {p.blocks?.length ?? 0} блок(ов)</p>
              </div>
              <ExternalLink className="w-4 h-4 text-vintage-dust shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
