import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { landingPageById } from "@/lib/db/landing-pages";
import { brandsAktiv } from "@/lib/db/brands";
import { LandingEditor } from "./landing-editor";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Редактировать лендинг" };
export const dynamic = "force-dynamic";

export default async function LandingEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [page, brands] = await Promise.all([
    landingPageById(id),
    brandsAktiv().catch(() => []),
  ]);
  if (!page) notFound();

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-2 text-xs font-sans text-vintage-dust">
        <Link href="/admin/landing" className="hover:text-vintage-brown flex items-center gap-1 transition-colors">
          <ChevronLeft className="w-3 h-3" /> Лендинги
        </Link>
        <span>/</span>
        <span className="text-vintage-ink truncate max-w-72">{page.titel}</span>
      </nav>

      <LandingEditor page={page} brands={brands} />
    </div>
  );
}
