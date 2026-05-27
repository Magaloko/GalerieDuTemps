"use client";

import { useEffect, useState } from "react";
import { Calculator, RefreshCw } from "lucide-react";

interface KursPublic {
  waehrung:    "KZT" | "EUR" | "USD" | "RUB";
  name:        string;
  symbol:      string;
  rate_to_kzt: number;
}

interface Props {
  label?:        string;
  name:          string;
  waehrungName?: string;
  defaultPreis?: number | string;
  defaultWaehrung?: string;
  required?:     boolean;
  error?:        string;
  hint?:         string;
  /** Live-Callback (numerischer Preis in der gewählten Währung) */
  onChange?:     (preis: number, waehrung: string) => void;
}

const FALLBACK: KursPublic[] = [
  { waehrung: "KZT", name: "Тенге", symbol: "₸", rate_to_kzt: 1   },
  { waehrung: "EUR", name: "Евро",   symbol: "€", rate_to_kzt: 540 },
  { waehrung: "USD", name: "USD",    symbol: "$", rate_to_kzt: 500 },
  { waehrung: "RUB", name: "₽",      symbol: "₽", rate_to_kzt: 5.5 },
];

function format(amount: number, currency: string): string {
  const locale = currency === "KZT" ? "ru-KZ" : currency === "RUB" ? "ru-RU" : currency === "USD" ? "en-US" : "de-DE";
  const frac   = currency === "KZT" ? 0 : 2;
  return amount.toLocaleString(locale, {
    style: "currency", currency,
    minimumFractionDigits: frac, maximumFractionDigits: frac,
  });
}

export function PreisMultiCurrency({
  label = "Цена",
  name,
  waehrungName = "waehrung",
  defaultPreis,
  defaultWaehrung = "KZT",
  required,
  error,
  hint,
  onChange,
}: Props) {
  const [preis, setPreisState]       = useState<string>(String(defaultPreis ?? ""));
  const [waehrung, setWaehrungState] = useState<string>(defaultWaehrung);

  const setPreis = (v: string) => {
    setPreisState(v);
    onChange?.(Number(v) || 0, waehrung);
  };
  const setWaehrung = (v: string) => {
    setWaehrungState(v);
    onChange?.(Number(preis) || 0, v);
  };
  const [kurse, setKurse]       = useState<KursPublic[]>(FALLBACK);
  const [loaded, setLoaded]     = useState(false);

  useEffect(() => {
    fetch("/api/wechselkurse")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.kurse?.length) setKurse(data.kurse);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const num = Number(preis) || 0;
  const aktiv = kurse.find(k => k.waehrung === waehrung) ?? kurse[0];

  // alle anderen Währungen für Preview
  const previews = kurse.filter(k => k.waehrung !== aktiv.waehrung).map(zielK => {
    const inKzt = num * aktiv.rate_to_kzt;
    const conv  = inKzt / zielK.rate_to_kzt;
    return { ...zielK, value: conv };
  });

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-xs font-sans uppercase tracking-widest text-vintage-gold/80">
          {label}{required && <span className="text-vintage-burgundy ml-0.5">*</span>}
        </label>
      )}

      <div className="flex gap-2">
        <input
          type="number"
          step="0.01"
          min="0"
          required={required}
          name={name}
          value={preis}
          onChange={(e) => setPreis(e.target.value)}
          placeholder="0.00"
          className={`flex-1 px-4 py-2.5 bg-vintage-brown border text-vintage-cream text-sm font-sans placeholder:text-vintage-dust focus:outline-none focus:border-vintage-gold focus:ring-1 focus:ring-vintage-gold/30 ${error ? "border-vintage-burgundy" : "border-vintage-sand/40"}`}
          style={{ borderRadius: "var(--radius-vintage)" }}
        />
        <select
          name={waehrungName}
          value={waehrung}
          onChange={(e) => setWaehrung(e.target.value)}
          className="w-28 px-3 py-2.5 bg-vintage-brown border border-vintage-sand/40 text-vintage-cream text-sm font-sans focus:outline-none focus:border-vintage-gold cursor-pointer"
          style={{ borderRadius: "var(--radius-vintage)" }}
        >
          {kurse.map(k => (
            <option key={k.waehrung} value={k.waehrung}>
              {k.symbol} {k.waehrung}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-xs text-vintage-burgundy font-sans">{error}</p>}
      {hint && !error && <p className="text-xs text-vintage-dust font-sans">{hint}</p>}

      {/* Live-Preview */}
      {num > 0 && (
        <div
          className="mt-1 flex items-start gap-2 px-3 py-2 bg-vintage-espresso/50 border border-vintage-sand/30"
          style={{ borderRadius: "var(--radius-vintage)" }}
        >
          <Calculator className="w-3.5 h-3.5 text-vintage-gold flex-shrink-0 mt-0.5" />
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <span className="text-vintage-dust">≈</span>
            {previews.map(p => (
              <span key={p.waehrung} className="text-vintage-cream/80 font-sans">
                {format(p.value, p.waehrung)}
              </span>
            ))}
            {!loaded && (
              <span className="flex items-center gap-1 text-vintage-dust/60">
                <RefreshCw className="w-3 h-3 animate-spin" /> Загрузка курсов …
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
