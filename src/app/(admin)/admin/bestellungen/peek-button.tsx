"use client";

import { PanelRight } from "lucide-react";

/**
 * PeekButton — feuert das window-Event "gdt:peek-order" mit der Order-ID.
 * Die global gemountete <OrderPeek> fängt es ab und öffnet das Slide-over.
 * Schlanker Client-Knopf, damit die Server-Tabelle intakt bleibt.
 */
export function PeekButton({ orderId }: { orderId: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("gdt:peek-order", { detail: orderId }))}
      className="row-action"
      title="Быстрый просмотр"
      aria-label="Быстрый просмотр"
    >
      <PanelRight className="w-4 h-4" />
    </button>
  );
}
