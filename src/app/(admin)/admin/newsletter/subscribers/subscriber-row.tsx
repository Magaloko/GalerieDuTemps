"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { subscriberDeleteAction } from "../actions";
import type { NewsletterSubscriber } from "@/types/newsletter";

export function SubscriberRow({ subscriber }: { subscriber: NewsletterSubscriber }) {
  const [pending, startTransition] = useTransition();
  const aktiv = subscriber.confirmed_am && !subscriber.unsubscribed_am;

  return (
    <tr className={`hover:bg-vintage-parchment/30 transition-colors ${pending ? "opacity-50" : ""}`}>
      <td className="px-4 py-3 text-vintage-ink">{subscriber.email}</td>
      <td className="px-4 py-3 text-vintage-dust">{subscriber.vorname ?? "–"}</td>
      <td className="px-4 py-3 text-vintage-dust text-xs">{subscriber.quelle ?? "–"}</td>
      <td className="px-4 py-3 text-center">
        {aktiv ? (
          <span className="px-2 py-0.5 text-xs bg-vintage-sage/10 text-vintage-sage" style={{ borderRadius: "var(--radius-vintage)" }}>активен</span>
        ) : subscriber.unsubscribed_am ? (
          <span className="px-2 py-0.5 text-xs bg-vintage-burgundy/10 text-vintage-burgundy" style={{ borderRadius: "var(--radius-vintage)" }}>отписан</span>
        ) : (
          <span className="px-2 py-0.5 text-xs bg-vintage-gold/10 text-vintage-gold" style={{ borderRadius: "var(--radius-vintage)" }}>не подтверждён</span>
        )}
      </td>
      <td className="px-4 py-3 text-vintage-dust text-xs">{new Date(subscriber.erstellt_am).toLocaleDateString("ru-RU")}</td>
      <td className="px-4 py-3 text-right">
        <button onClick={() => { if (confirm("Удалить безвозвратно?")) startTransition(() => subscriberDeleteAction(subscriber.id)); }}
          disabled={pending}
          className="p-1.5 text-vintage-dust hover:text-vintage-burgundy">
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
