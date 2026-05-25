"use client";

import { useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Ban, ExternalLink, Mail, Clock } from "lucide-react";
import { freischaltenAction, sperrenAction } from "./actions";
import type { AffiliateMitSponsor } from "@/types/affiliate";

const STATUS_STYLE: Record<string, { label: string; klasse: string }> = {
  pending:   { label: "Wartet",     klasse: "text-vintage-gold     bg-vintage-gold/10     border-vintage-gold/30"     },
  aktiv:     { label: "Aktiv",      klasse: "text-vintage-sage     bg-vintage-sage/10     border-vintage-sage/30"     },
  gesperrt:  { label: "Gesperrt",   klasse: "text-vintage-burgundy bg-vintage-burgundy/10 border-vintage-burgundy/30" },
  geloescht: { label: "Gelöscht",   klasse: "text-vintage-dust     bg-vintage-dust/10     border-vintage-dust/30"     },
};

export function AffiliateZeile({ affiliate }: { affiliate: AffiliateMitSponsor }) {
  const [pending, startTransition] = useTransition();
  const style = STATUS_STYLE[affiliate.status] ?? STATUS_STYLE.aktiv;

  const handleFreischalten = () => {
    startTransition(() => freischaltenAction(affiliate.id));
  };

  const handleSperren = () => {
    const grund = prompt("Grund für die Sperrung:");
    if (!grund) return;
    startTransition(() => sperrenAction(affiliate.id, grund));
  };

  return (
    <div
      className={`bg-vintage-white border p-5 transition-colors ${
        affiliate.status === "pending" ? "border-vintage-gold/50 bg-vintage-gold/5" : "border-vintage-sand"
      } ${pending ? "opacity-50" : ""}`}
      style={{ borderRadius: "var(--radius-card)" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          {/* Avatar */}
          <div className="w-10 h-10 bg-vintage-parchment border border-vintage-sand flex items-center justify-center flex-shrink-0" style={{ borderRadius: "var(--radius-card)" }}>
            <span className="text-vintage-brown text-sm font-serif">
              {affiliate.vorname[0]}{affiliate.nachname[0]}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-serif text-vintage-espresso">
                {affiliate.vorname} {affiliate.nachname}
              </p>
              <span className={`inline-block px-2 py-0.5 text-xs font-sans border ${style.klasse}`} style={{ borderRadius: "var(--radius-vintage)" }}>
                {style.label}
              </span>
              <span className="font-mono text-xs text-vintage-gold tracking-widest">
                {affiliate.referral_code}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-vintage-dust font-sans">
              <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {affiliate.email}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(affiliate.erstellt_am).toLocaleDateString("de-DE")}</span>
              {affiliate.sponsor_name && (
                <span>Geworben von: <strong className="text-vintage-brown">{affiliate.sponsor_name}</strong></span>
              )}
            </div>

            {affiliate.sperr_grund && (
              <p className="text-xs text-vintage-burgundy font-sans mt-2 italic">Grund: {affiliate.sperr_grund}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {affiliate.status === "pending" && (
            <button
              onClick={handleFreischalten}
              disabled={pending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-vintage-sage text-white text-xs font-sans tracking-widest uppercase hover:bg-vintage-forest transition-colors disabled:opacity-50"
              style={{ borderRadius: "var(--radius-button)" }}
            >
              <CheckCircle2 className="w-3 h-3" /> Freischalten
            </button>
          )}

          {affiliate.status === "aktiv" && (
            <button
              onClick={handleSperren}
              disabled={pending}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-vintage-burgundy text-vintage-burgundy text-xs font-sans tracking-widest uppercase hover:bg-vintage-burgundy/10 transition-colors disabled:opacity-50"
              style={{ borderRadius: "var(--radius-button)" }}
            >
              <Ban className="w-3 h-3" /> Sperren
            </button>
          )}

          <Link
            href={`/admin/affiliates/${affiliate.id}`}
            className="p-2 text-vintage-dust hover:text-vintage-brown hover:bg-vintage-parchment transition-colors"
            style={{ borderRadius: "var(--radius-vintage)" }}
            title="Details"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
