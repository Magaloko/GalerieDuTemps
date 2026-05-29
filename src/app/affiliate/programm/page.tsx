import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ArrowRight, Percent, Users, Wallet, ShieldCheck, Sparkles, Coins } from "lucide-react";
import { affiliateEinstellungenLaden } from "@/lib/db/affiliate-settings";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:       "Партнёрская программа — зарабатывайте с Galerie du Temps",
  description: "Станьте партнёром и получайте вознаграждение за каждую приведённую продажу. Многоуровневые комиссии до 3 уровней.",
};

export const revalidate = 3600;

export default async function PartnerProgrammPage() {
  const settings = await affiliateEinstellungenLaden().catch(() => null);
  const e1 = settings?.provision_ebene_1_prozent ?? 10;
  const e2 = settings?.provision_ebene_2_prozent ?? 3;
  const e3 = settings?.provision_ebene_3_prozent ?? 0;
  const offen = settings?.registrierung_offen ?? true;

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1">

        {/* Hero */}
        <section className="relative bg-vintage-espresso texture-paper overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
            <div className="max-w-2xl">
              <p className="text-vintage-gold text-sm tracking-[0.3em] uppercase mb-4">
                ✦ &nbsp; Партнёрская программа
              </p>
              <h1 className="font-serif text-4xl md:text-6xl text-vintage-cream leading-tight mb-6">
                Зарабатывайте на каждой <em className="text-vintage-gold not-italic">приведённой вещи</em>
              </h1>
              <p className="text-vintage-cream/70 text-lg leading-relaxed mb-10 font-sans">
                Делитесь нашими винтажными находками в соцсетях, блоге или с друзьями.
                За каждую приведённую продажу вы получаете вознаграждение — а за продажи
                приглашённых вами партнёров ещё и дополнительную комиссию.
              </p>
              <div className="flex flex-wrap gap-4">
                {offen ? (
                  <Link href="/affiliate/registrieren" className="inline-flex items-center gap-2 px-8 py-4 bg-vintage-gold text-vintage-cream font-sans text-sm tracking-widest uppercase hover:bg-vintage-copper transition-colors" style={{ borderRadius: "var(--radius-button)" }}>
                    Стать партнёром <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="px-8 py-4 border border-vintage-cream/30 text-vintage-cream/70 font-sans text-sm tracking-widest uppercase" style={{ borderRadius: "var(--radius-button)" }}>
                    Регистрация временно закрыта
                  </span>
                )}
                <Link href="/affiliate/anmelden" className="inline-flex items-center gap-2 px-8 py-4 border border-vintage-cream/30 text-vintage-cream font-sans text-sm tracking-widest uppercase hover:bg-vintage-espresso/10 transition-colors" style={{ borderRadius: "var(--radius-button)" }}>
                  Войти
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Provisionsmodell */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">✦ Модель вознаграждения</p>
            <h2 className="font-serif text-3xl text-vintage-cream">Как вы зарабатываете</h2>
            <p className="text-vintage-dust font-sans mt-2 max-w-xl mx-auto">
              Многоуровневая система — вы получаете доход напрямую со своих продаж
              и косвенно с продаж партнёров, которых вы пригласили.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <ProvisionsKarte
              ebene={1}
              prozent={e1}
              titel="Прямая комиссия"
              beschreibung="За каждую продажу, совершённую по вашей реферальной ссылке."
              icon={Percent}
              hervorgehoben
            />
            <ProvisionsKarte
              ebene={2}
              prozent={e2}
              titel="Спонсорская комиссия"
              beschreibung="Когда продажу приводит партнёр, которого пригласили вы."
              icon={Users}
            />
            {e3 > 0 && (
              <ProvisionsKarte
                ebene={3}
                prozent={e3}
                titel="Расширенный уровень"
                beschreibung="За продажи партнёров ваших партнёров — полный потенциал сети."
                icon={Sparkles}
              />
            )}
          </div>

          <div className="mt-8 p-5 bg-vintage-brown/40 border border-vintage-sand/40 text-sm font-sans text-vintage-cream/80" style={{ borderRadius: "var(--radius-card)" }}>
            <strong>Пример расчёта:</strong> продажа на 100 000 ₸ по вашей ссылке → <strong>{Math.round(100000 * e1 / 100).toLocaleString("ru-RU")} ₸</strong> прямой комиссии.
            {e2 > 0 && <> Если эту же продажу приведёт приглашённый вами партнёр, вы получите <strong>{Math.round(100000 * e2 / 100).toLocaleString("ru-RU")} ₸</strong> спонсорской комиссии.</>}
          </div>
        </section>

        {/* So funktioniert's */}
        <section className="bg-vintage-brown/40 py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">✦ В 4 шага</p>
              <h2 className="font-serif text-3xl text-vintage-cream">Как это работает</h2>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
              {[
                { nr: "01", titel: "Регистрация", text: "Бесплатная регистрация, принятие условий, ожидание подтверждения." },
                { nr: "02", titel: "Делитесь ссылками", text: "Создавайте персональные реферальные ссылки на любые товары." },
                { nr: "03", titel: "Приводите",    text: "Клиенты переходят и связываются с нами — продажу оформляем мы." },
                { nr: "04", titel: "Зарабатывайте", text: "После успешной продажи ваше вознаграждение начисляется автоматически." },
              ].map((s) => (
                <div key={s.nr} className="bg-vintage-brown border border-vintage-sand/40 p-5" style={{ borderRadius: "var(--radius-card)" }}>
                  <p className="font-serif text-3xl text-vintage-gold mb-2">{s.nr}</p>
                  <p className="font-serif text-lg text-vintage-cream mb-1">{s.titel}</p>
                  <p className="text-vintage-dust text-sm font-sans leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Vorteile */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Wallet,      titel: "Быстрые выплаты",     text: "Ежемесячные выплаты на банковскую карту или Kaspi при достижении минимального баланса." },
              { icon: ShieldCheck, titel: "Честные условия",     text: "Прозрачные условия, 14 дней на возврат, без скрытых комиссий." },
              { icon: Coins,       titel: "Длительный учёт",     text: "Cookie действует 30 дней — вы получаете вознаграждение и за отложенные покупки." },
            ].map(({ icon: Icon, titel, text }) => (
              <div key={titel} className="p-6 bg-vintage-brown border border-vintage-sand/40" style={{ borderRadius: "var(--radius-card)" }}>
                <Icon className="w-6 h-6 text-vintage-gold mb-3" />
                <p className="font-serif text-lg text-vintage-cream mb-2">{titel}</p>
                <p className="text-vintage-dust text-sm font-sans leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-vintage-brown/40 py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">✦ FAQ</p>
              <h2 className="font-serif text-3xl text-vintage-cream">Частые вопросы</h2>
            </div>
            <div className="space-y-3">
              {[
                {
                  frage: "Что нужно, чтобы получать выплаты?",
                  antwort: "Достаточно указать реквизиты для выплаты (банковскую карту или Kaspi) в профиле партнёра. Мы подскажем нужные данные при регистрации.",
                },
                {
                  frage: "Когда выплачивается вознаграждение?",
                  antwort: "После успешной продажи вознаграждение сразу начисляется (статус «открыто»). По истечении 14-дневного срока возврата оно подтверждается. Выплаты — ежемесячно при достижении минимального баланса.",
                },
                {
                  frage: "Сколько действует трекинг-cookie?",
                  antwort: "Когда клиент переходит по вашей ссылке, устанавливается cookie на 30 дней. Если покупка совершается в этот срок, вы получаете вознаграждение.",
                },
                {
                  frage: "Что будет при возврате?",
                  antwort: "Если клиент отказывается от покупки в течение 14-дневного срока возврата, вознаграждение отменяется. После истечения срока оно становится окончательным.",
                },
                {
                  frage: "Могу ли я купить сам и получить вознаграждение?",
                  antwort: "Нет. Самостоятельные покупки автоматически распознаются и блокируются (по совпадению e-mail). Это противоречит правилам программы.",
                },
              ].map((q) => (
                <details key={q.frage} className="bg-vintage-brown border border-vintage-sand/40 p-5 group" style={{ borderRadius: "var(--radius-card)" }}>
                  <summary className="font-serif text-vintage-cream cursor-pointer list-none flex items-center justify-between">
                    {q.frage}
                    <span className="text-vintage-gold group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="text-vintage-dust text-sm font-sans mt-3 leading-relaxed">{q.antwort}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <p className="text-vintage-gold text-xs tracking-widest uppercase mb-3">✦</p>
          <h2 className="font-serif text-3xl text-vintage-cream mb-4">Готовы начать?</h2>
          <p className="text-vintage-cream/80 font-sans mb-8 max-w-md mx-auto">
            Регистрация занимает 2 минуты. После подтверждения вы сразу сможете
            создавать свои первые реферальные ссылки.
          </p>
          {offen && (
            <Link href="/affiliate/registrieren" className="inline-flex items-center gap-2 px-8 py-4 bg-vintage-espresso text-vintage-cream font-sans text-sm tracking-widest uppercase hover:bg-vintage-brown transition-colors" style={{ borderRadius: "var(--radius-button)" }}>
              Стать партнёром <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function ProvisionsKarte({
  ebene, prozent, titel, beschreibung, icon: Icon, hervorgehoben = false,
}: {
  ebene: number; prozent: number; titel: string; beschreibung: string;
  icon: React.ElementType; hervorgehoben?: boolean;
}) {
  return (
    <div
      className={`
        relative p-6 border
        ${hervorgehoben
          ? "bg-vintage-gold/10 border-vintage-gold"
          : "bg-vintage-brown border-vintage-sand/40"
        }
      `}
      style={{ borderRadius: "var(--radius-card)" }}
    >
      <p className="text-vintage-dust text-xs font-sans uppercase tracking-widest">Уровень {ebene}</p>
      <p className="font-serif text-5xl text-vintage-gold mt-1">{prozent}%</p>
      <div className="flex items-center gap-2 mt-3 mb-2">
        <Icon className="w-4 h-4 text-vintage-cream/80" />
        <p className="font-serif text-lg text-vintage-cream">{titel}</p>
      </div>
      <p className="text-vintage-dust text-sm font-sans leading-relaxed">{beschreibung}</p>
    </div>
  );
}
