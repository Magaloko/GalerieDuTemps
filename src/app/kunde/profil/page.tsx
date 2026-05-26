import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { customerById } from "@/lib/db/customers";
import { brandBotUsername } from "@/lib/db/customer-telegram";
import { ProfilFormular } from "./profil-formular";
import { TelegramSection } from "./telegram-section";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Профиль" };
export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const session = await auth();
  if (!session || session.user?.role !== "customer") redirect("/kunde/anmelden");
  const [customer, botUsername] = await Promise.all([
    customerById(session.user.id),
    brandBotUsername().catch(() => null),
  ]);
  if (!customer) redirect("/kunde/anmelden");

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p
          className="text-[11px] uppercase font-medium mb-2"
          style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
        >
          ✦ Профиль
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   28,
            color:      "var(--color-ink)",
          }}
        >
          Мой профиль
        </h1>
        <p
          className="mt-1 text-sm"
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--color-ink-soft)",
          }}
        >
          Личные данные, адрес, уведомления.
        </p>
      </div>

      <ProfilFormular customer={customer} />

      <TelegramSection
        customerId={customer.id}
        chatId={customer.telegram_chat_id ?? null}
        username={customer.telegram_username ?? null}
        verknuepftAm={customer.telegram_verknuepft_am ?? null}
        notificationsAn={customer.telegram_notifications_aktiv ?? true}
        botUsername={botUsername}
      />
    </div>
  );
}
