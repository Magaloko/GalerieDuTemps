import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { systemEinstellungenLaden } from "@/lib/db/system-einstellungen";
import { affiliateEinstellungenLaden } from "@/lib/db/affiliate-settings";
import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:       "Партнёрское соглашение",
  description: "Условия партнёрской программы Galerie du Temps.",
  alternates:  { canonical: "/affiliate/agb" },
};
export const revalidate = 3600;

export default async function AgbPage() {
  const [sys, aff] = await Promise.all([
    systemEinstellungenLaden(),
    affiliateEinstellungenLaden(),
  ]);

  const stand = new Date().toLocaleDateString("ru-RU", { year: "numeric", month: "long" });

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">

        <div className="border-b border-vintage-sand/40 pb-6">
          <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">✦</p>
          <h1 className="font-serif text-3xl text-vintage-cream">Партнёрское соглашение</h1>
          <p className="text-vintage-dust text-xs font-sans mt-2">
            Версия <strong>{aff.agb_aktuelle_version}</strong> · Редакция {stand}
          </p>
        </div>

        {/* TEMPLATE-WARNUNG */}
        <div className="flex items-start gap-3 p-5 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy" style={{ borderRadius: "var(--radius-card)" }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm font-sans space-y-2">
            <p><strong>Примечание к шаблону (удалить перед публикацией):</strong></p>
            <p>Это соглашение является <strong>шаблоном / образцом</strong> и не является юридической
            консультацией. Шаблон — перед публикацией проверить у юриста в Казахстане,
            специализирующемся на электронной коммерции и партнёрском маркетинге, и адаптировать
            под вашу бизнес-модель.</p>
            <p>В частности, проверить: версионирование, условия возврата, ссылки на политику
            конфиденциальности, налоговые положения и разграничение с финансовыми (сетевыми)
            пирамидами при многоуровневых структурах в соответствии с законодательством РК.</p>
          </div>
        </div>

        <article className="prose max-w-none text-vintage-cream font-sans leading-relaxed space-y-6 text-sm">

          {/* §1 */}
          <section>
            <h2 className="font-serif text-xl text-vintage-cream">1. Стороны и сфера действия</h2>
            <p>(1) Настоящие условия регулируют участие в партнёрской программе:</p>
            <p className="ml-4 my-3 p-3 bg-vintage-brown/40 border border-vintage-sand/40 text-xs" style={{ borderRadius: "var(--radius-vintage)" }}>
              {sys.firma_name || "[Firmenname]"}<br/>
              {sys.firma_strasse || "[Straße]"}<br/>
              {sys.firma_plz} {sys.firma_ort || "[PLZ Ort]"}<br/>
              {sys.firma_email && <>Эл. почта: {sys.firma_email}<br/></>}
              {sys.firma_handelsregister && <>Рег. данные: {sys.firma_handelsregister}<br/></>}
              {sys.firma_ust_id && <>БИН/ИИН: {sys.firma_ust_id}</>}
            </p>
            <p>(2) Партнёрами могут быть исключительно индивидуальные предприниматели (ИП) или ТОО
            с действующей регистрацией предпринимательской деятельности. Физические лица — потребители
            к участию не допускаются.</p>
            <p>(3) Применяются исключительно настоящие условия. Иные условия не признаются.</p>
          </section>

          {/* §2 */}
          <section>
            <h2 className="font-serif text-xl text-vintage-cream">2. Услуги партнёра</h2>
            <p>(1) Партнёр рекламирует товары компании на собственных рекламных площадках
            (сайт, блог, социальные сети, рассылка по собственным контактам) и привлекает
            потенциальных покупателей.</p>
            <p>(2) Привлечение осуществляется через персонализированные реферальные ссылки с
            трек-кодом. Покупки, совершённые в течение срока действия cookie
            ({aff.cookie_ttl_tage} дней), засчитываются партнёру (по последнему клику).</p>
            <p>(3) Партнёр обязуется чётко обозначать рекламные материалы как рекламу
            («Реклама», «#реклама») в соответствии с требованиями законодательства РК о рекламе
            и конкуренции.</p>
          </section>

          {/* §3 */}
          <section>
            <h2 className="font-serif text-xl text-vintage-cream">3. Вознаграждение</h2>
            <p>(1) За каждую успешно привлечённую продажу партнёр получает вознаграждение в
            размере <strong>{aff.provision_ebene_1_prozent}%</strong> от чистой цены продажи (уровень 1).</p>
            <p>(2) Если партнёр привлёк другого партнёра (спонсорское вознаграждение), он получает за
            продажи этого суб-партнёра <strong>{aff.provision_ebene_2_prozent}%</strong> (уровень 2).
            {aff.provision_ebene_3_prozent > 0 && <> За третий уровень выплачивается <strong>{aff.provision_ebene_3_prozent}%</strong>.</>}</p>
            <p>(3) <strong>Разграничение с финансовыми (сетевыми) пирамидами:</strong> вознаграждение
            выплачивается исключительно за фактические продажи товаров. Вознаграждение только за
            привлечение новых партнёров не выплачивается ни при каких обстоятельствах.</p>
            <p>(4) Право на вознаграждение возникает при ручном подтверждении продажи компанией
            (статус «открыто») и подтверждается по истечении срока возврата согласно законодательству РК,
            составляющего{" "}{aff.widerrufs_frist_tage} дней.</p>
            <p>(5) При возврате, отмене или аннулировании сделки право на вознаграждение прекращается.</p>
          </section>

          {/* §4 */}
          <section>
            <h2 className="font-serif text-xl text-vintage-cream">4. Выплата</h2>
            <p>(1) Выплата производится ежемесячно при условии, что накопленная сумма достигает
            минимального размера <strong>{(aff.mindestauszahlung_cent / 100).toFixed(2).replace(".", ",")} €</strong>.</p>
            <p>(2) Способы выплаты: банковский перевод или электронные платёжные системы — выбираются
            в профиле партнёра.</p>
            <p>(3) Налогообложение выплат осуществляется в соответствии с налоговым законодательством
            Республики Казахстан с учётом налогового статуса партнёра (ИП или ТОО).</p>
            <p>(4) Партнёр обязуется указать в профиле корректные банковские реквизиты / платёжные
            данные, а также БИН/ИИН.</p>
          </section>

          {/* §5 */}
          <section>
            <h2 className="font-serif text-xl text-vintage-cream">5. Обязанности партнёра</h2>
            <p>(1) Партнёр гарантирует, что его реклама соответствует действующему законодательству
            Республики Казахстан (о рекламе и конкуренции, о товарных знаках, об авторском праве,
            о персональных данных).</p>
            <p>(2) В частности, запрещены:</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>спам, незапрошенные письма / сообщения</li>
              <li>брендовый биддинг (реклама по товарным знакам компании)</li>
              <li>cookie-stuffing, рекламное ПО, манипуляции с cookie</li>
              <li>покупки в свою пользу (привлечение самого себя — блокируется автоматически)</li>
              <li>вводящие в заблуждение или противоправные рекламные заявления</li>
            </ul>
            <p>(3) Нарушения влекут немедленную блокировку и, при необходимости, требование о
            возмещении убытков.</p>
          </section>

          {/* §6 */}
          <section>
            <h2 className="font-serif text-xl text-vintage-cream">6. Срок действия / расторжение</h2>
            <p>(1) Договорные отношения начинаются с момента активации партнёрского аккаунта компанией
            и заключаются на неопределённый срок.</p>
            <p>(2) Обе стороны вправе расторгнуть соглашение в любое время без указания причин.</p>
            <p>(3) При расторжении уже возникшие и подтверждённые вознаграждения выплачиваются в
            обычном порядке.</p>
          </section>

          {/* §7 */}
          <section>
            <h2 className="font-serif text-xl text-vintage-cream">7. Защита персональных данных</h2>
            <p>Обработка персональных данных осуществляется в соответствии с законодательством РК о
            персональных данных и нашей
            <a href="/datenschutz" className="text-vintage-cream/80 underline ml-1">Политикой конфиденциальности</a>.
            Файлы cookie для отслеживания устанавливаются только с явного согласия посетителя.</p>
          </section>

          {/* §8 */}
          <section>
            <h2 className="font-serif text-xl text-vintage-cream">8. Заключительные положения</h2>
            <p>(1) Применяется законодательство Республики Казахстан. Местом исполнения и подсудности
            является{sys.firma_ort ? ` ${sys.firma_ort}` : " место нахождения компании"}, насколько это
            допускается законом.</p>
            <p>(2) Если отдельные положения окажутся недействительными, действительность остальных
            положений сохраняется (положение о делимости).</p>
            <p>(3) Изменения соглашения сообщаются не менее чем за 30 дней до вступления в силу по
            электронной почте. Если партнёр не возражает в течение этого срока, новая редакция
            считается принятой.</p>
          </section>

          <p className="text-vintage-dust text-xs italic pt-6 border-t border-vintage-sand/40">
            Редакция: {stand} · Версия соглашения {aff.agb_aktuelle_version}
          </p>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
