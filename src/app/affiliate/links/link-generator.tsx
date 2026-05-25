"use client";

import { useState, useEffect, useMemo } from "react";
import { Copy, Check, Link2, ImageIcon, Sparkles, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { formatPreis } from "@/lib/utils/preis";

interface ProduktOption {
  slug:          string;
  name:          string;
  preis:         number;
  hauptbild_url: string | null;
}

interface Props {
  referralCode: string;
  baseUrl:      string;
  produkte:     ProduktOption[];
}

export function LinkGenerator({ referralCode, baseUrl, produkte }: Props) {
  const [ziel, setZiel]     = useState<"home" | "katalog" | "produkt">("home");
  const [slug, setSlug]     = useState<string>("");
  const [linkType, setLinkType] = useState<"short" | "full">("short");
  const [kopiert, setKopiert]   = useState(false);
  const [qrSvg, setQrSvg]   = useState<string>("");

  // URL berechnen
  const url = useMemo(() => {
    if (linkType === "short") {
      // /r/CODE?to=/zielpfad
      const to = ziel === "home"     ? null
               : ziel === "katalog"  ? "/katalog"
               : ziel === "produkt" && slug ? `/katalog/${slug}`
               : null;
      const shortBase = `${baseUrl}/r/${referralCode}`;
      return to ? `${shortBase}?to=${encodeURIComponent(to)}` : shortBase;
    } else {
      // Vollständige URL mit ?ref=CODE
      const pfad = ziel === "home"     ? "/"
                 : ziel === "katalog"  ? "/katalog"
                 : ziel === "produkt" && slug ? `/katalog/${slug}`
                 : "/";
      const sep = pfad.includes("?") ? "&" : "?";
      return `${baseUrl}${pfad}${sep}ref=${referralCode}`;
    }
  }, [baseUrl, referralCode, ziel, slug, linkType]);

  // QR-Code generieren
  useEffect(() => {
    QRCode.toString(url, {
      type:       "svg",
      width:      200,
      margin:     1,
      color:      { dark: "#4A2C1A", light: "#FDFAF5" },
      errorCorrectionLevel: "M",
    }).then(setQrSvg).catch(() => setQrSvg(""));
  }, [url]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 2000);
    } catch {
      // Fallback: window.prompt
      window.prompt("Link kopieren (Ctrl+C):", url);
    }
  };

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* Linke Spalte: Konfiguration */}
      <div className="lg:col-span-3 space-y-5">
        {/* Ziel-Auswahl */}
        <section className="bg-vintage-brown border border-vintage-sand/40 p-5 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
          <h2 className="font-serif text-base text-vintage-cream">1. Wohin soll der Link führen?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { value: "home",    label: "Hauptseite", icon: Sparkles },
              { value: "katalog", label: "Katalog",    icon: ImageIcon },
              { value: "produkt", label: "Produkt",    icon: Link2 },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setZiel(value as "home" | "katalog" | "produkt")}
                className={`flex flex-col items-center gap-1.5 p-3 border transition-colors ${
                  ziel === value
                    ? "bg-vintage-espresso text-vintage-cream border-vintage-espresso"
                    : "bg-vintage-espresso text-vintage-cream/80 border-vintage-sand/40 hover:border-vintage-gold"
                }`}
                style={{ borderRadius: "var(--radius-card)" }}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs font-sans">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Produkt-Auswahl */}
        {ziel === "produkt" && (
          <section className="bg-vintage-brown border border-vintage-sand/40 p-5 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
            <h2 className="font-serif text-base text-vintage-cream">2. Welches Produkt?</h2>
            {produkte.length === 0 ? (
              <p className="text-vintage-dust text-sm font-sans py-4 text-center">Keine Produkte verfügbar</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
                {produkte.map(p => (
                  <button
                    key={p.slug}
                    onClick={() => setSlug(p.slug)}
                    className={`p-2 border transition-colors text-left ${
                      slug === p.slug
                        ? "border-vintage-gold ring-1 ring-vintage-gold bg-vintage-gold/5"
                        : "border-vintage-sand/40 hover:border-vintage-gold bg-vintage-espresso"
                    }`}
                    style={{ borderRadius: "var(--radius-card)" }}
                  >
                    <div className="aspect-square mb-2 bg-vintage-brown/40 overflow-hidden" style={{ borderRadius: "var(--radius-vintage)" }}>
                      {p.hauptbild_url
                        ? <img src={p.hauptbild_url} alt={p.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-vintage-sand">✦</div>
                      }
                    </div>
                    <p className="text-xs text-vintage-cream truncate font-sans">{p.name}</p>
                    <p className="text-xs text-vintage-gold font-serif">{formatPreis(p.preis)}</p>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Link-Typ */}
        <section className="bg-vintage-brown border border-vintage-sand/40 p-5 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
          <h2 className="font-serif text-base text-vintage-cream">3. Link-Typ</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setLinkType("short")}
              className={`p-3 border text-left transition-colors ${
                linkType === "short" ? "border-vintage-gold bg-vintage-gold/5" : "border-vintage-sand/40 bg-vintage-espresso hover:border-vintage-gold"
              }`}
              style={{ borderRadius: "var(--radius-card)" }}
            >
              <p className="font-sans text-sm text-vintage-cream">Kurzer Link</p>
              <p className="text-xs text-vintage-dust font-mono mt-1">/r/{referralCode}</p>
              <p className="text-xs text-vintage-dust font-sans mt-1">Übersichtlich für Social Media</p>
            </button>
            <button
              onClick={() => setLinkType("full")}
              className={`p-3 border text-left transition-colors ${
                linkType === "full" ? "border-vintage-gold bg-vintage-gold/5" : "border-vintage-sand/40 bg-vintage-espresso hover:border-vintage-gold"
              }`}
              style={{ borderRadius: "var(--radius-card)" }}
            >
              <p className="font-sans text-sm text-vintage-cream">Voller Link</p>
              <p className="text-xs text-vintage-dust font-mono mt-1">?ref={referralCode}</p>
              <p className="text-xs text-vintage-dust font-sans mt-1">Zeigt direkt das Ziel</p>
            </button>
          </div>
        </section>
      </div>

      {/* Rechte Spalte: Ergebnis + QR */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-vintage-espresso text-vintage-cream p-5 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
          <p className="text-vintage-gold text-xs tracking-widest uppercase">Dein Link</p>
          <div
            className="px-3 py-2 bg-white/10 break-all text-vintage-cream text-xs font-mono"
            style={{ borderRadius: "var(--radius-vintage)" }}
          >
            {url}
          </div>
          <button
            onClick={handleCopy}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 font-sans text-xs tracking-widest uppercase transition-colors ${
              kopiert
                ? "bg-vintage-sage text-white"
                : "bg-vintage-gold text-vintage-cream hover:bg-vintage-copper"
            }`}
            style={{ borderRadius: "var(--radius-button)" }}
          >
            {kopiert
              ? <><Check className="w-4 h-4" /> Kopiert!</>
              : <><Copy  className="w-4 h-4" /> Link kopieren</>
            }
          </button>
        </div>

        {/* QR-Code */}
        {qrSvg && (
          <div className="bg-vintage-brown border border-vintage-sand/40 p-5 text-center" style={{ borderRadius: "var(--radius-card)" }}>
            <p className="text-vintage-dust text-xs uppercase tracking-widest font-sans mb-3 flex items-center justify-center gap-1">
              <QrCode className="w-3.5 h-3.5" /> QR-Code
            </p>
            <div
              className="inline-block p-3 bg-vintage-espresso"
              style={{ borderRadius: "var(--radius-card)" }}
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="text-xs text-vintage-dust font-sans mt-3">Für Druck oder Stories</p>
          </div>
        )}
      </div>
    </div>
  );
}
