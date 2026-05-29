import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { brandById } from "@/lib/db/brands";
import { BrandEditor } from "./brand-editor";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Редактировать бренд" };
export const dynamic = "force-dynamic";

export default async function BrandEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brand = await brandById(id);
  if (!brand) notFound();

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-2 text-xs font-sans text-vintage-dust">
        <Link href="/admin/brands" className="hover:text-vintage-brown flex items-center gap-1 transition-colors">
          <ChevronLeft className="w-3 h-3" /> Бренды
        </Link>
        <span>/</span>
        <span className="text-vintage-ink truncate max-w-72">{brand.name}</span>
      </nav>

      <BrandEditor brand={brand} />
    </div>
  );
}
