"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Mail,
  CheckCircle2,
  Archive,
  Trash2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Coins,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { statusAendernAction, anfrageLoeschenAction } from "./actions";
import { VerkauftDialog } from "./verkauft-dialog";
import type { Kontaktanfrage, KontaktStatus } from "@/lib/db/kontakt";

const STATUS_CONFIG: Record<string, { label: string; variant: "gold" | "sage" | "dust" | "espresso" | "burgundy" }> = {
  neu:         { label: "Новая",      variant: "gold"     },
  gelesen:     { label: "Прочитана",  variant: "espresso" },
  beantwortet: { label: "Отвечена",   variant: "sage"     },
  verkauft:    { label: "Продана",    variant: "burgundy" },
  archiviert:  { label: "В архиве",   variant: "dust"     },
};

export function KontaktZeile({ anfrage }: { anfrage: Kontaktanfrage }) {
  const [offen, setOffen] = useState(anfrage.status === "neu");
  const [pending, startTransition] = useTransition();
  const [verkauftDialogOpen, setVerkauftDialogOpen] = useState(false);

  const handleStatus = (status: KontaktStatus) => {
    startTransition(() => statusAendernAction(anfrage.id, status));
  };

  const handleDelete = () => {
    if (!confirm(`Удалить заявку от ${anfrage.name}?`)) return;
    startTransition(() => anfrageLoeschenAction(anfrage.id));
  };

  return (
    <div
      className={`
        border transition-colors
        ${anfrage.status === "neu" ? "border-vintage-gold/50 bg-vintage-gold/5" : "border-vintage-sand bg-vintage-white"}
        ${pending ? "opacity-50" : ""}
      `}
      style={{ borderRadius: "var(--radius-card)" }}
    >
      {/* Kopfzeile */}
      <button
        onClick={() => setOffen(o => !o)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-vintage-parchment/40 transition-colors"
      >
        <div className="flex-shrink-0">
          <Badge variant={STATUS_CONFIG[anfrage.status].variant}>
            {STATUS_CONFIG[anfrage.status].label}
          </Badge>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-serif text-vintage-espresso truncate">{anfrage.name}</p>
            <span className="text-vintage-dust text-xs">·</span>
            <p className="text-xs text-vintage-dust font-sans truncate">{anfrage.email}</p>
          </div>
          {anfrage.betreff && (
            <p className="text-sm text-vintage-brown font-sans mt-0.5 truncate">{anfrage.betreff}</p>
          )}
          <p className="text-xs text-vintage-dust font-sans mt-0.5">
            {new Date(anfrage.erstellt_am).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        {offen ? <ChevronUp className="w-4 h-4 text-vintage-dust" /> : <ChevronDown className="w-4 h-4 text-vintage-dust" />}
      </button>

      {/* Details (expandiert) */}
      {offen && (
        <div className="border-t border-vintage-sand p-5 space-y-4">
          {/* Verbundenes Produkt */}
          {anfrage.produkt_id && (
            <Link
              href={`/admin/produkte/${anfrage.produkt_id}`}
              className="flex items-center gap-2 text-xs text-vintage-brown hover:text-vintage-espresso transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Товар: {anfrage.produkt_name ?? "Неизвестно"}
            </Link>
          )}

          {/* Nachricht */}
          <div
            className="p-4 bg-vintage-parchment border border-vintage-sand text-vintage-ink font-sans text-sm leading-relaxed whitespace-pre-line"
            style={{ borderRadius: "var(--radius-vintage)" }}
          >
            {anfrage.nachricht}
          </div>

          {/* Aktionen */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap gap-2">
              <a
                href={`mailto:${anfrage.email}?subject=Re: ${encodeURIComponent(anfrage.betreff ?? "Ваш запрос")}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-vintage-espresso text-vintage-cream text-xs font-sans tracking-widest uppercase hover:bg-vintage-brown transition-colors"
                style={{ borderRadius: "var(--radius-button)" }}
              >
                <Mail className="w-3 h-3" /> Ответить
              </a>

              {anfrage.status !== "beantwortet" && anfrage.status !== "verkauft" && (
                <button
                  onClick={() => handleStatus("beantwortet")}
                  disabled={pending}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-vintage-sage text-vintage-forest text-xs font-sans tracking-widest uppercase hover:bg-vintage-sage/10 transition-colors disabled:opacity-50"
                  style={{ borderRadius: "var(--radius-button)" }}
                >
                  <CheckCircle2 className="w-3 h-3" /> Завершить
                </button>
              )}

              {anfrage.status !== "verkauft" && (
                <button
                  onClick={() => setVerkauftDialogOpen(true)}
                  disabled={pending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-vintage-gold text-vintage-espresso text-xs font-sans tracking-widest uppercase hover:bg-vintage-copper transition-colors disabled:opacity-50"
                  style={{ borderRadius: "var(--radius-button)" }}
                >
                  <Coins className="w-3 h-3" /> Отметить как проданную
                </button>
              )}

              {anfrage.status !== "archiviert" && (
                <button
                  onClick={() => handleStatus("archiviert")}
                  disabled={pending}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-vintage-sand text-vintage-dust text-xs font-sans tracking-widest uppercase hover:bg-vintage-parchment transition-colors disabled:opacity-50"
                  style={{ borderRadius: "var(--radius-button)" }}
                >
                  <Archive className="w-3 h-3" /> В архив
                </button>
              )}

              {anfrage.status === "neu" && (
                <button
                  onClick={() => handleStatus("gelesen")}
                  disabled={pending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-vintage-dust text-xs font-sans tracking-widest uppercase hover:bg-vintage-parchment transition-colors disabled:opacity-50"
                  style={{ borderRadius: "var(--radius-button)" }}
                >
                  Отметить как прочитанную
                </button>
              )}
            </div>

            <button
              onClick={handleDelete}
              disabled={pending}
              className="p-2 text-vintage-dust hover:text-vintage-burgundy transition-colors disabled:opacity-50"
              style={{ borderRadius: "var(--radius-vintage)" }}
              aria-label="Удалить"
              title="Удалить"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Verkauft-Dialog (Modal) */}
      {verkauftDialogOpen && (
        <VerkauftDialog
          kontaktanfrageId={anfrage.id}
          kontaktName={anfrage.name}
          onClose={() => setVerkauftDialogOpen(false)}
        />
      )}
    </div>
  );
}
