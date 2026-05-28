import { TelegramAuthGate } from "../auth-gate";
import { WunschlisteClient } from "./wunschliste-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Избранное · Galerie du Temps",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /tg/wunschliste — Mini-App Wishlist
 *
 * Backend: /api/wunschliste arbeitet mit dem `wl_token` HttpOnly-Cookie das
 * auch von der Web-Wishlist verwendet wird. Da Telegram-WebView ein eigener
 * Cookie-Jar ist, ist die Mini-App-Wishlist faktisch separat von der Web-
 * Wishlist — das ist OK, das stand auch im B2-Konzept so.
 *
 * Wenn die Web-Wishlist später cross-context synchronisiert werden soll,
 * passiert das über die Customer-Verknüpfung (siehe Stage 3 Cart-Sync).
 * ────────────────────────────────────────────────────────────────────────── */
export default function TgWunschlistePage() {
  return (
    <TelegramAuthGate>
      <WunschlisteClient />
    </TelegramAuthGate>
  );
}
