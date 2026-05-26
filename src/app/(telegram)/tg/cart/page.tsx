import { TelegramAuthGate } from "../auth-gate";
import { CartClient } from "./cart-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Корзина",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default function TelegramCartPage() {
  return (
    <TelegramAuthGate>
      <CartClient />
    </TelegramAuthGate>
  );
}
