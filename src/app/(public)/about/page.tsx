import type { Metadata } from "next";

export const metadata: Metadata = {
  title:       "Über uns – Galerie du Temps",
  description: "Unsere Geschichte und Leidenschaft für hochwertige Vintage-Stücke.",
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">

      {/* Header */}
      <div className="text-center">
        <p className="text-vintage-gold text-xs tracking-widest uppercase mb-3">✦</p>
        <h1 className="font-serif text-4xl text-vintage-espresso">Über uns</h1>
      </div>

      {/* Geschichte */}
      <div className="prose max-w-none space-y-5">
        <p className="text-vintage-brown leading-relaxed font-sans text-lg">
          Galerie du Temps entstand aus einer tiefen Leidenschaft für Objekte,
          die mehr als nur Dinge sind — sie sind Träger von Geschichten,
          Zeugnisse vergangener Epochen und handwerklicher Meisterschaft.
        </p>
        <p className="text-vintage-brown leading-relaxed font-sans">
          Seit über einem Jahrzehnt durchforsten wir Flohmärkte, Antiquitätenmessen
          und Nachlassversteigerungen in Deutschland und Europa, um jene Stücke
          zu finden, die den Zahn der Zeit überdauert haben — und das zurecht.
        </p>
        <p className="text-vintage-brown leading-relaxed font-sans">
          Jedes Objekt in unserem Sortiment wird sorgfältig begutachtet,
          dokumentiert und wenn nötig behutsam restauriert. Wir glauben an
          Transparenz: Zustand, Herkunft und Geschichte werden offen kommuniziert.
        </p>
      </div>

      {/* Werte */}
      <div>
        <p className="text-vintage-gold text-xs tracking-widest uppercase mb-6">✦ Unsere Werte</p>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              titel: "Authentizität",
              text:  "Jedes Stück ist echt — keine Reproduktionen, keine Fälschungen.",
            },
            {
              titel: "Transparenz",
              text:  "Wir beschreiben Zustand und Geschichte ehrlich und vollständig.",
            },
            {
              titel: "Nachhaltigkeit",
              text:  "Vintage kaufen heißt Ressourcen schonen und Handwerk ehren.",
            },
          ].map(({ titel, text }) => (
            <div
              key={titel}
              className="p-6 bg-vintage-parchment border border-vintage-sand"
              style={{ borderRadius: "var(--radius-card)" }}
            >
              <p className="font-serif text-lg text-vintage-espresso mb-2">{titel}</p>
              <p className="text-vintage-dust text-sm font-sans leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div
        className="text-center py-10 bg-vintage-espresso"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <p className="text-vintage-gold text-xs tracking-widest uppercase mb-3">✦</p>
        <p className="font-serif text-2xl text-vintage-cream mb-4">
          Neugierig geworden?
        </p>
        <a
          href="/katalog"
          className="
            inline-flex items-center gap-2
            px-8 py-3 bg-vintage-gold text-vintage-espresso
            font-sans text-xs tracking-widest uppercase
            hover:bg-vintage-copper transition-colors
          "
          style={{ borderRadius: "var(--radius-button)" }}
        >
          Kollektion entdecken
        </a>
      </div>
    </div>
  );
}
