import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { customerById } from "@/lib/db/customers";
import { ProfilFormular } from "./profil-formular";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Профиль" };
export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const session = await auth();
  if (!session || session.user?.role !== "customer") redirect("/kunde/anmelden");
  const customer = await customerById(session.user.id);
  if (!customer) redirect("/kunde/anmelden");

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-3xl text-vintage-espresso">Мой профиль</h1>
        <p className="text-vintage-dust text-sm font-sans mt-1">Личные данные, адрес, рассылка</p>
      </div>
      <ProfilFormular customer={customer} />
    </div>
  );
}
