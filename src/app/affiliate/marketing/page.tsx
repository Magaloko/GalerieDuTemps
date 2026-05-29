import { Megaphone, Copy } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Маркетинговые материалы" };

const TEXTE = [
  {
    titel: "Коротко для соцсетей",
    text:  "✦ Винтажные находки с историей. Тщательно отобранные вещи из прошлых десятилетий — открывайте в Galerie du Temps.",
  },
  {
    titel: "Письмо-рекомендация",
    text:  "Здравствуйте, {Name}!\n\nЯ наткнулся на по-настоящему особенный винтажный маркетплейс: Galerie du Temps. Тщательно отобранные вещи с настоящим характером, прозрачные описания и честные цены.\n\nЗагляните:\n{LINK}\n\nС уважением",
  },
  {
    titel: "Рекомендация товара",
    text:  "Не могу не показать вам эту вещь — настоящая винтажная редкость! ✨\n\nПодробнее: {LINK}\n\n#реклама #винтаж #рекомендация",
  },
];

export default function MarketingPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-3xl text-vintage-cream">Маркетинговые материалы</h1>
        <p className="text-vintage-dust text-sm font-sans mt-1">Готовые тексты и баннеры для вашего продвижения</p>
      </div>

      {/* Werbe-Hinweis */}
      <div className="flex items-start gap-3 p-4 bg-vintage-gold/10 border border-vintage-gold/30 text-vintage-cream/80 text-xs font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
        <Megaphone className="w-4 h-4 text-vintage-gold flex-shrink-0 mt-0.5" />
        <p>
          <strong>Маркировка рекламы:</strong> Всегда отмечайте партнёрские публикации как рекламу —
          <code className="mx-1 px-1 bg-vintage-brown/40">#реклама</code>.
        </p>
      </div>

      {/* Text-Vorlagen */}
      <section className="space-y-3">
        <h2 className="font-serif text-lg text-vintage-cream">Текстовые шаблоны</h2>
        {TEXTE.map((t, i) => (
          <div key={i} className="bg-vintage-brown border border-vintage-sand/40 p-5" style={{ borderRadius: "var(--radius-card)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-serif text-vintage-cream">{t.titel}</p>
              <button
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-sans uppercase tracking-widest text-vintage-cream/80 border border-vintage-sand/40 hover:bg-vintage-brown/40 transition-colors"
                style={{ borderRadius: "var(--radius-button)" }}
              >
                <Copy className="w-3 h-3" /> Копировать
              </button>
            </div>
            <pre className="text-sm font-sans text-vintage-cream whitespace-pre-wrap leading-relaxed bg-vintage-espresso p-4 border border-vintage-sand/30" style={{ borderRadius: "var(--radius-vintage)" }}>
              {t.text}
            </pre>
          </div>
        ))}
      </section>

      {/* Banner-Platzhalter */}
      <section className="bg-vintage-brown border border-vintage-sand/40 p-6 text-center" style={{ borderRadius: "var(--radius-card)" }}>
        <p className="font-serif text-vintage-cream/80">Баннеры и графика</p>
        <p className="text-vintage-dust text-sm font-sans mt-1">Скоро будут доступны</p>
      </section>
    </div>
  );
}
