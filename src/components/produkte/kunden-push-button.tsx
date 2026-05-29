"use client";

import { useTransition } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { produktKundenPushAction } from "@/app/(admin)/admin/produkte/actions";
import { useToast } from "@/components/ui/toast-provider";

/* ──────────────────────────────────────────────────────────────────────────
 * KundenPushButton — Editor-Action „📣 Уведомить подписчиков о новинке".
 *
 * Dezenter Button für die Produkt-Editor-Header-Leiste. Sichtbar nur wenn das
 * Produkt aktiv/veröffentlicht ist (Render-Bedingung beim Aufrufer). confirm()
 * vor dem Versand, Toast-Feedback. Sendet Web-Push an audience='customer'.
 * ────────────────────────────────────────────────────────────────────────── */

export function KundenPushButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();

  const onClick = () => {
    if (!confirm("Отправить push-уведомление всем подписчикам о новинке?")) return;
    start(async () => {
      const r = await produktKundenPushAction(id);
      if ("ok" in r) toast.success("Уведомление отправлено ✓");
      else toast.error(r.error ?? "Ошибка");
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title="Уведомить подписчиков о новинке (web-push)"
      className="flex items-center gap-2 px-4 py-2 border border-vintage-sand text-vintage-brown text-xs font-sans uppercase tracking-widest hover:bg-vintage-parchment transition-colors disabled:opacity-60"
      style={{ borderRadius: "var(--radius-button)" }}
    >
      {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
      📣 Уведомить о новинке
    </button>
  );
}
