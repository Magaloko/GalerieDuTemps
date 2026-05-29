import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { systemEinstellungenLaden } from "@/lib/db/system-einstellungen";
import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:       "Политика конфиденциальности",
  description: "Информация об обработке персональных данных согласно Закону РК «О персональных данных и их защите».",
  alternates:  { canonical: "/datenschutz" },
};
export const revalidate = 3600;

export default async function DatenschutzPage() {
  const sys = await systemEinstellungenLaden();
  const stand = new Date().toLocaleDateString("ru-RU", { year: "numeric", month: "long" });

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">

        <div className="border-b border-vintage-sand/40 pb-6">
          <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">✦</p>
          <h1 className="font-serif text-3xl text-vintage-cream">Политика конфиденциальности</h1>
          <p className="text-vintage-dust text-xs font-sans mt-2">Редакция: {stand}</p>
        </div>

        <div className="flex items-start gap-3 p-5 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy" style={{ borderRadius: "var(--radius-card)" }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-sans">
            <strong>Примечание:</strong> Шаблон — перед публикацией проверить у юриста.
            Необходимо адаптировать под используемые сервисы (Brevo, DeepSeek, Stripe и др.)
            и привести в соответствие с законодательством Республики Казахстан о персональных данных.
          </p>
        </div>

        <article className="text-vintage-cream font-sans leading-relaxed space-y-6 text-sm">

          <section>
            <h2 className="font-serif text-xl text-vintage-cream">1. Ответственное лицо</h2>
            <div className="ml-4 my-3 p-3 bg-vintage-brown/40 border border-vintage-sand/40 text-xs" style={{ borderRadius: "var(--radius-vintage)" }}>
              {sys.firma_name}<br/>
              {sys.firma_strasse}<br/>
              {sys.firma_plz} {sys.firma_ort}<br/>
              {sys.firma_email && <>Эл. почта: {sys.firma_email}<br/></>}
              {sys.firma_telefon && <>Телефон: {sys.firma_telefon}</>}
            </div>
          </section>

          <section>
            <h2 className="font-serif text-xl text-vintage-cream">2. Собираемые данные</h2>
            <h3 className="font-serif text-vintage-cream/80 mt-3">При посещении сайта</h3>
            <ul className="list-disc ml-6 space-y-1">
              <li>Журналы сервера (IP-адрес, время доступа, запрошенная страница, User-Agent) — технически необходимы, срок хранения не более 7 дней</li>
              <li>Файлы cookie — только с согласия (см. баннер cookie)</li>
            </ul>
            <h3 className="font-serif text-vintage-cream/80 mt-3">При использовании формы обратной связи</h3>
            <ul className="list-disc ml-6 space-y-1">
              <li>Имя, эл. почта, сообщение, при необходимости ссылка на товар</li>
              <li>Основание обработки: исполнение договора и преддоговорные меры в соответствии с законодательством РК о персональных данных</li>
            </ul>
            <h3 className="font-serif text-vintage-cream/80 mt-3">При участии в партнёрской программе</h3>
            <ul className="list-disc ml-6 space-y-1">
              <li>Учётные данные, банковские реквизиты (номер счёта зашифрован с помощью pgcrypto), ИИН/БИН</li>
              <li>Журналы переходов с хешированными IP/User-Agent — псевдонимизированы, не более 90 дней</li>
              <li>Основание обработки: исполнение договора в соответствии с законодательством РК о персональных данных</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl text-vintage-cream">3. Файлы cookie и отслеживание</h2>
            <p>Мы используем следующие категории файлов cookie:</p>
            <ul className="list-disc ml-6 space-y-1 mt-2">
              <li><strong>Необходимые:</strong> токен сессии (NextAuth), защита от CSRF — согласие не требуется</li>
              <li><strong>Партнёрское отслеживание:</strong> cookie <code className="bg-vintage-brown/40 px-1">aff_ref</code> (HttpOnly, 30 дней) — только с согласия. Связывает покупки с партнёрами.</li>
              <li><strong>Аналитика:</strong> (в данный момент отключена) — может быть добавлена позже</li>
            </ul>
            <p className="mt-3">Вы можете в любой момент изменить настройки cookie через ссылку «Настройки cookie» в нижней части сайта.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-vintage-cream">4. Лица, обрабатывающие данные по поручению</h2>
            <p>Мы привлекаем следующих поставщиков услуг на основании договора об обработке данных:</p>
            <ul className="list-disc ml-6 space-y-1 mt-2">
              <li><strong>Brevo SAS (Франция)</strong> — транзакционные письма. <a className="text-vintage-cream/80 underline" href="https://www.brevo.com/legal/privacypolicy/" target="_blank" rel="noopener">Конфиденциальность</a></li>
              <li><strong>DeepSeek (Китай)</strong> — ИИ-ассистент (только содержимое чата, без персональных данных). <a className="text-vintage-cream/80 underline" href="https://www.deepseek.com" target="_blank" rel="noopener">Конфиденциальность</a></li>
              {sys.stripe_connect_enabled && (
                <li><strong>Stripe (Ирландия)</strong> — обработка выплат партнёрам. <a className="text-vintage-cream/80 underline" href="https://stripe.com/de/privacy" target="_blank" rel="noopener">Конфиденциальность</a></li>
              )}
              <li><strong>Hostinger</strong> — хостинг</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl text-vintage-cream">5. Ваши права</h2>
            <p>В соответствии с законодательством РК о персональных данных вы имеете следующие права в отношении нас:</p>
            <ul className="list-disc ml-6 space-y-1 mt-2">
              <li>получение информации о ваших персональных данных</li>
              <li>исправление неточных данных</li>
              <li>удаление данных</li>
              <li>ограничение обработки</li>
              <li>переносимость данных</li>
              <li>возражение против обработки</li>
              <li>отзыв согласия в любой момент</li>
            </ul>
            <p className="mt-3">Запросы направляйте по адресу: {sys.firma_email || "[укажите эл. почту]"}</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-vintage-cream">6. Право на обжалование</h2>
            <p>Вы имеете право подать жалобу в уполномоченный орган по защите персональных данных
            Республики Казахстан.</p>
          </section>

          <p className="text-vintage-dust text-xs italic pt-6 border-t border-vintage-sand/40">
            Редакция: {stand}
          </p>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
