import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { TelegramAuthGate } from "../../auth-gate";
import { AdminBack, AdminHeader, AdminEmpty, AdminNotAllowed } from "../_ui";
import { alleCoupons } from "@/lib/db/coupons";
import { CouponRow } from "./coupon-row";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Промокоды · Mini-App", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function TgAdminCoupons() {
  const session = await getWebAppSession();
  if (!session || session.role !== "admin") {
    return <TelegramAuthGate><AdminNotAllowed /></TelegramAuthGate>;
  }
  const coupons = await alleCoupons().catch(() => []);

  return (
    <TelegramAuthGate>
      <main className="p-4 pb-8">
        <AdminBack />
        <AdminHeader eyebrow="✦ Каталог" titel="Промокоды" sub={`${coupons.length} всего`} />
        {coupons.length === 0 ? (
          <AdminEmpty text="Промокодов пока нет. Создайте на сайте." />
        ) : (
          <div className="space-y-2">
            {coupons.map(c => (
              <CouponRow
                key={c.id}
                id={c.id}
                code={c.code}
                wertLabel={c.typ === "prozent" ? `−${c.wert}%` : `−${c.wert} ₸`}
                beschreibung={c.beschreibung}
                aktiv={c.aktiv}
              />
            ))}
          </div>
        )}
      </main>
    </TelegramAuthGate>
  );
}
