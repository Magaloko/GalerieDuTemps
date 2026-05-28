import Link from "next/link";
import { claimPruefen } from "@/lib/db/customer-telegram-claim";
import { AuthShell } from "@/components/auth/auth-shell";
import { ClaimForm } from "./claim-form";
import { AlertCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:  "Привязка Telegram",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /kunde/telegram-claim?token=<...>
 *
 * Ziel des Magic-Links aus der Telegram-Claim-Email. Server-Component lädt
 * den Claim-Preview (Token-Validation + Expiry-Check) und gibt ihn an
 * Client-Form weiter, die die Confirm-Action triggert.
 *
 * Token-Format: 48 hex chars. Nicht im URL-Path (Logging-Hygiene), nur in
 * Query-Param mit referrer-policy noreferrer in Email-Links.
 * ────────────────────────────────────────────────────────────────────────── */
export default async function TelegramClaimPage({
  searchParams,
}: { searchParams: Promise<{ token?: string }> }) {
  const sp    = await searchParams;
  const token = sp.token ?? "";
  const claim = token ? await claimPruefen(token).catch(() => null) : null;

  if (!claim) {
    return (
      <AuthShell
        eyebrow="Привязка Telegram"
        titel="Ссылка недействительна"
        footer={
          <Link
            href="/"
            className="text-[11px] uppercase font-medium hover:opacity-80 transition-opacity"
            style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
          >
            ← На главную
          </Link>
        }
      >
        <div className="text-center space-y-5">
          <div
            className="inline-flex items-center justify-center"
            style={{
              width:        64,
              height:       64,
              background:   "rgba(232,112,58,0.08)",
              border:       "1px solid rgba(232,112,58,0.40)",
              borderRadius: "50%",
            }}
          >
            <AlertCircle className="w-8 h-8" style={{ color: "var(--color-coral-deep, #A53E26)" }} />
          </div>
          <p
            className="text-sm"
            style={{
              fontFamily: "var(--font-italic)",
              fontStyle:  "italic",
              color:      "var(--color-ink-soft)",
              lineHeight: 1.6,
            }}
          >
            Ссылка недействительна или истекла. Откройте Mini-App ещё раз и
            запросите новую ссылку — у вас есть 15 минут на подтверждение.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Привязка Telegram" titel="Подтвердите привязку">
      <ClaimForm
        token={token}
        email={claim.email}
        vorname={claim.vorname}
        chatId={claim.chat_id}
        username={claim.username}
        expiresAt={claim.expires_at}
      />
    </AuthShell>
  );
}
