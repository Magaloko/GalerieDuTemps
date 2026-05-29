import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { affiliateById } from "@/lib/db/affiliates";
import { katalogProdukte } from "@/lib/db/produkte-public";
import { LinkGenerator } from "./link-generator";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Мои ссылки" };
export const dynamic = "force-dynamic";

export default async function LinksPage() {
  const session = await auth();
  if (!session || session.user?.role !== "affiliate") redirect("/affiliate/anmelden");

  const affiliate = await affiliateById(session.user.id);
  if (!affiliate) redirect("/affiliate/anmelden");

  const produkte = await katalogProdukte({ limit: 12 });
  const baseUrl  = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-3xl text-vintage-espresso">Мои ссылки</h1>
        <p className="text-vintage-dust text-sm font-sans mt-1">
          Создавайте реферальные ссылки на любые товары или на главную страницу
        </p>
      </div>

      <LinkGenerator
        referralCode={affiliate.referral_code}
        baseUrl={baseUrl}
        produkte={produkte.items.map(p => ({
          slug:           p.slug,
          name:           p.name,
          preis:          p.preis,
          hauptbild_url:  p.hauptbild_url,
        }))}
      />
    </div>
  );
}
