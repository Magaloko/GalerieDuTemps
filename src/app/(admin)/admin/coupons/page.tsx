import { alleCoupons } from "@/lib/db/coupons";
import { formatPreis } from "@/lib/utils/preis";
import { Tag } from "lucide-react";
import { CouponNeuFormular } from "./coupon-neu-formular";
import { CouponZeile } from "./coupon-zeile";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Промокоды" };
export const dynamic = "force-dynamic";

export default async function CouponsPage() {
  const coupons = await alleCoupons();

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2">
        <Tag className="w-5 h-5 text-vintage-gold" />
        <div>
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso">Промокоды</h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">{coupons.length} активных кодов</p>
        </div>
      </div>

      <CouponNeuFormular />

      <section>
        <h2 className="font-serif text-lg text-vintage-espresso mb-3">Все промокоды</h2>
        {coupons.length === 0 ? (
          <p className="text-vintage-dust text-sm font-sans text-center py-12 bg-vintage-white border border-vintage-sand" style={{ borderRadius: "var(--radius-card)" }}>
            Промокодов пока нет. Создайте первый выше.
          </p>
        ) : (
          <div className="space-y-2">
            {coupons.map(c => <CouponZeile key={c.id} coupon={c} formatPreisFn={formatPreis} />)}
          </div>
        )}
      </section>
    </div>
  );
}
