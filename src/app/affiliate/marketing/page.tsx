import { Megaphone, Copy } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Marketing-Material" };

const TEXTE = [
  {
    titel: "Kurz für Social Media",
    text:  "✦ Vintage-Schätze mit Geschichte. Handverlesene Stücke aus vergangenen Jahrzehnten – jetzt entdecken bei Galerie du Temps.",
  },
  {
    titel: "Empfehlungs-Mail",
    text:  "Hallo {Name},\n\nich bin auf einen wirklich besonderen Vintage-Marktplatz gestoßen: Galerie du Temps. Sorgfältig ausgewählte Stücke mit echtem Charakter, transparente Beschreibungen und faire Preise.\n\nSchau gerne mal vorbei:\n{LINK}\n\nViele Grüße",
  },
  {
    titel: "Produkt-Empfehlung",
    text:  "Dieses Stück sollte ich euch nicht vorenthalten — eine echte Vintage-Rarität! ✨\n\nMehr Details: {LINK}\n\n#Werbung #Vintage #Empfehlung",
  },
];

export default function MarketingPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-3xl text-vintage-espresso">Marketing-Material</h1>
        <p className="text-vintage-dust text-sm font-sans mt-1">Vorgefertigte Texte und Banner für deine Promo</p>
      </div>

      {/* Werbe-Hinweis */}
      <div className="flex items-start gap-3 p-4 bg-vintage-gold/10 border border-vintage-gold/30 text-vintage-brown text-xs font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
        <Megaphone className="w-4 h-4 text-vintage-gold flex-shrink-0 mt-0.5" />
        <p>
          <strong>Werbekennzeichnung Pflicht:</strong> Markiere deine Affiliate-Posts immer mit
          <code className="mx-1 px-1 bg-vintage-parchment">#Werbung</code> oder
          <code className="mx-1 px-1 bg-vintage-parchment">#Anzeige</code> — das ist
          in Deutschland gesetzlich vorgeschrieben (UWG).
        </p>
      </div>

      {/* Text-Vorlagen */}
      <section className="space-y-3">
        <h2 className="font-serif text-lg text-vintage-espresso">Text-Vorlagen</h2>
        {TEXTE.map((t, i) => (
          <div key={i} className="bg-vintage-white border border-vintage-sand p-5" style={{ borderRadius: "var(--radius-card)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-serif text-vintage-espresso">{t.titel}</p>
              <button
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-sans uppercase tracking-widest text-vintage-brown border border-vintage-sand hover:bg-vintage-parchment transition-colors"
                style={{ borderRadius: "var(--radius-button)" }}
              >
                <Copy className="w-3 h-3" /> Kopieren
              </button>
            </div>
            <pre className="text-sm font-sans text-vintage-ink whitespace-pre-wrap leading-relaxed bg-vintage-cream p-4 border border-vintage-sand/50" style={{ borderRadius: "var(--radius-vintage)" }}>
              {t.text}
            </pre>
          </div>
        ))}
      </section>

      {/* Banner-Platzhalter */}
      <section className="bg-vintage-white border border-vintage-sand p-6 text-center" style={{ borderRadius: "var(--radius-card)" }}>
        <p className="font-serif text-vintage-brown">Banner und Grafiken</p>
        <p className="text-vintage-dust text-sm font-sans mt-1">Werden in Kürze verfügbar sein</p>
      </section>
    </div>
  );
}
