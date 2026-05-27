"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";

/**
 * Refresh-Button für System-Health Page.
 * router.refresh() reloads Server-Components ohne Full-Page-Reload.
 */
export function SystemHealthRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [last,    setLast]         = useState<Date | null>(null);

  const onClick = () => {
    startTransition(() => {
      router.refresh();
      setLast(new Date());
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans uppercase tracking-widest hover:bg-vintage-sand/40 transition-colors disabled:opacity-50"
        style={{
          border:       "1px solid var(--color-line)",
          borderRadius: "var(--radius-vintage)",
          color:        "var(--color-ink)",
        }}
      >
        {pending ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            проверка…
          </>
        ) : (
          <>
            <RefreshCw className="w-3.5 h-3.5" />
            Обновить
          </>
        )}
      </button>
      {last && (
        <span className="text-[10px] text-vintage-dust font-sans">
          обновлено {last.toLocaleTimeString("ru")}
        </span>
      )}
    </div>
  );
}
