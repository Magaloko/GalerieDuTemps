import { getModuleBase } from "@/lib/module-base-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { benutzerListe } from "@/lib/db/benutzer";
import { BenutzerVerwaltungClient } from "./client";
import { ChevronLeft, Users } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Администраторы" };
export const dynamic = "force-dynamic";

export default async function BenutzerVerwaltungPage() {
  const base = await getModuleBase();
  const session = await auth();
  if (session?.user?.role !== "superadmin") {
    redirect(base);
  }

  const users = await benutzerListe();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2 text-xs font-sans text-vintage-dust">
        <Link href={`${base}/einstellungen`} className="hover:text-vintage-brown transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Настройки
        </Link>
        <span>/</span>
        <span className="text-vintage-ink">Администраторы</span>
      </div>

      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-2xl text-vintage-espresso flex items-center gap-2">
          <Users className="w-5 h-5 text-vintage-gold" /> Администраторы
        </h1>
        <p className="text-vintage-dust text-xs font-sans mt-0.5">
          Создание, назначение ролей и деактивация. Доступ к этой странице есть только у superadmin.
        </p>
      </div>

      <BenutzerVerwaltungClient
        users={users}
        currentUserId={session?.user?.id ?? ""}
      />
    </div>
  );
}
