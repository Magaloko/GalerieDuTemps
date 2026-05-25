"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import type { Affiliate } from "@/types/affiliate";

interface Props {
  affiliate:   Affiliate;
  stripeReady: boolean;
  stripeMode:  "test" | "live";
  urlStatus?:  string;
}

const STATUS_MELDUNGEN: Record<string, { text: string; klasse: string }> = {
  connected:        { text: "Stripe-Konto erfolgreich verbunden!",     klasse: "bg-vintage-sage/10 text-vintage-forest border-vintage-sage/30" },
  invalid:          { text: "Ungültige OAuth-Antwort",                 klasse: "bg-vintage-burgundy/10 text-vintage-burgundy border-vintage-burgundy/30" },
  error:            { text: "Fehler beim Verbinden",                   klasse: "bg-vintage-burgundy/10 text-vintage-burgundy border-vintage-burgundy/30" },
  not_configured:   { text: "Stripe ist noch nicht konfiguriert. Bitte Admin kontaktieren.", klasse: "bg-vintage-gold/10 text-vintage-brown border-vintage-gold/30" },
  stub_not_implemented: { text: "Stripe-SDK noch nicht installiert (Dev-Stub). Siehe Setup-Anleitung.", klasse: "bg-vintage-gold/10 text-vintage-brown border-vintage-gold/30" },
};

export function StripeConnectSektion({ affiliate, stripeReady, stripeMode, urlStatus }: Props) {
  const [pending, setPending] = useState(false);
  const verbunden = !!affiliate.stripe_account_id;
  const meldung   = urlStatus ? STATUS_MELDUNGEN[urlStatus] : null;

  const trennen = async () => {
    if (!confirm("Stripe-Konto wirklich trennen? Auszahlungen müssen dann wieder manuell erfolgen.")) return;
    setPending(true);
    try {
      await fetch("/api/affiliate/stripe/disconnect", { method: "POST" });
      window.location.reload();
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="bg-vintage-white border border-vintage-sand p-6 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
      <div className="flex items-center justify-between border-b border-vintage-sand/50 pb-3">
        <div>
          <h2 className="font-serif text-lg text-vintage-espresso">Automatische Auszahlung via Stripe</h2>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">
            Verbinde dein Stripe-Konto für automatische Provisions-Auszahlungen
          </p>
        </div>
        {stripeMode === "test" && (
          <span className="px-2 py-0.5 text-xs font-sans uppercase tracking-widest bg-vintage-copper/20 text-vintage-copper border border-vintage-copper/30" style={{ borderRadius: "var(--radius-vintage)" }}>
            Test-Modus
          </span>
        )}
      </div>

      {meldung && (
        <div className={`flex items-start gap-3 p-4 border text-sm font-sans ${meldung.klasse}`} style={{ borderRadius: "var(--radius-vintage)" }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {meldung.text}
        </div>
      )}

      {verbunden ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 bg-vintage-sage/10 border border-vintage-sage/30" style={{ borderRadius: "var(--radius-vintage)" }}>
            <CheckCircle2 className="w-5 h-5 text-vintage-sage flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-serif text-vintage-forest">Stripe-Konto verbunden</p>
              <p className="text-xs text-vintage-dust font-sans mt-1 font-mono truncate">
                {affiliate.stripe_account_id}
              </p>
              <div className="flex gap-3 mt-2 text-xs font-sans">
                <span className={affiliate.stripe_payouts_enabled ? "text-vintage-sage" : "text-vintage-dust"}>
                  {affiliate.stripe_payouts_enabled ? "✓" : "○"} Auszahlungen aktiv
                </span>
                <span className={affiliate.stripe_charges_enabled ? "text-vintage-sage" : "text-vintage-dust"}>
                  {affiliate.stripe_charges_enabled ? "✓" : "○"} Konto freigeschaltet
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={trennen}
            disabled={pending}
            className="px-4 py-2 border border-vintage-burgundy text-vintage-burgundy text-xs font-sans tracking-widest uppercase hover:bg-vintage-burgundy/10 transition-colors disabled:opacity-50"
            style={{ borderRadius: "var(--radius-button)" }}
          >
            {pending ? <><Loader2 className="w-3 h-3 inline animate-spin mr-1" /> ...</> : "Stripe-Konto trennen"}
          </button>
        </div>
      ) : stripeReady ? (
        <a
          href="/api/affiliate/stripe/connect"
          className="inline-flex items-center gap-2 px-5 py-3 bg-[#635BFF] text-white text-sm font-sans tracking-wide hover:bg-[#524acc] transition-colors"
          style={{ borderRadius: "var(--radius-button)" }}
        >
          <ExternalLink className="w-4 h-4" />
          Mit Stripe verbinden
        </a>
      ) : (
        <div className="flex items-start gap-3 p-4 bg-vintage-dust/10 border border-vintage-dust/30 text-vintage-dust text-sm font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>Stripe-Connect ist aktiviert, aber die API-Schlüssel sind noch nicht konfiguriert.
          Solange erfolgen Auszahlungen weiterhin manuell via SEPA/PayPal aus deinem Profil.</p>
        </div>
      )}
    </section>
  );
}
