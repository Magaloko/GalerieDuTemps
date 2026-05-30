import { getModuleBase } from "@/lib/module-base-server";
import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";
import { getKiKeyStatus } from "@/lib/db/ki-einstellungen";
import { KiEinstellungenFormular } from "./client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ИИ / DeepSeek" };
export const dynamic = "force-dynamic";

export default async function KiEinstellungenPage() {
  const base = await getModuleBase();
  const status = await getKiKeyStatus();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href={`${base}/einstellungen`}
          className="p-1.5 hover:bg-vintage-sand/40 transition-colors"
          style={{ borderRadius: "var(--radius-vintage)" }}
          aria-label="Назад"
        >
          <ChevronLeft className="w-4 h-4 text-vintage-dust" />
        </Link>
        <Sparkles className="w-5 h-5 text-vintage-gold" />
        <div>
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso">ИИ · DeepSeek</h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">
            API-ключ для ассистента и ИИ-заполнения товаров
          </p>
        </div>
      </div>

      <KiEinstellungenFormular status={status} />
    </div>
  );
}
