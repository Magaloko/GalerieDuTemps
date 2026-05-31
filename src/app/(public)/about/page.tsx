import type { Metadata } from "next";

export const metadata: Metadata = {
  title:       "О нас",
  description: "Наша история и страсть к качественным винтажным вещам.",
  alternates:  { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16 bg-bone text-ink">

      <div className="text-center">
        <p className="eyebrow mb-3">✦</p>
        <h1 className="font-serif text-4xl text-ink">О нас</h1>
      </div>

      <div className="prose max-w-none space-y-5">
        <p className="text-ink-soft leading-relaxed font-sans text-lg">
          Galerie du Temps родилась из глубокой любви к предметам, которые
          представляют собой нечто большее, чем просто вещи — они носители
          историй, свидетели прошлых эпох и мастерства, отточенного веками.
        </p>
        <p className="text-ink-soft leading-relaxed font-sans">
          Уже более десяти лет мы исследуем блошиные рынки, антикварные ярмарки
          и аукционы наследия по всему миру, чтобы найти те вещи, которые
          выдержали испытание временем — и сделали это по праву.
        </p>
        <p className="text-ink-soft leading-relaxed font-sans">
          Каждый предмет в нашей коллекции тщательно проверяется, документируется
          и при необходимости бережно реставрируется. Мы верим в прозрачность:
          состояние, происхождение и история вещи открыто описываются.
        </p>
      </div>

      <div>
        <p className="eyebrow mb-6">✦ Наши ценности</p>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              titel: "Подлинность",
              text:  "Каждая вещь подлинная — никаких репродукций или подделок.",
            },
            {
              titel: "Прозрачность",
              text:  "Мы честно и подробно описываем состояние и историю каждой вещи.",
            },
            {
              titel: "Экологичность",
              text:  "Покупать винтаж — значит беречь ресурсы и уважать мастерство.",
            },
          ].map(({ titel, text }) => (
            <div
              key={titel}
              className="p-6 bg-app-surface border border-line rounded-[var(--radius-card)]"
            >
              <p className="font-serif text-lg text-ink mb-2">{titel}</p>
              <p className="text-ink-mute text-sm font-sans leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>

      <div
        className="text-center py-10 bg-app-surface rounded-[var(--radius-card)]"
      >
        <p className="eyebrow mb-3">✦</p>
        <p className="font-serif text-2xl text-ink mb-4">
          Заинтересовались?
        </p>
        <a
          href="/katalog"
          className="
            inline-flex items-center gap-2
            px-8 py-3 bg-coral text-white
            font-sans text-xs tracking-widest uppercase
            hover:bg-coral-bright transition-colors
            rounded-[var(--radius-vintage)]
          "
        >
          Открыть коллекцию
        </a>
      </div>
    </div>
  );
}
