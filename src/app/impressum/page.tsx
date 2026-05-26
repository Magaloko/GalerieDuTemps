import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { systemEinstellungenLaden } from "@/lib/db/system-einstellungen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:       "Реквизиты",
  description: "Реквизиты компании Galerie du Temps. Алматы, Казахстан.",
  alternates:  { canonical: "/impressum" },
};
export const revalidate = 3600;

/* ──────────────────────────────────────────────────────────────────────────
 * Реквизиты / Impressum — KZ-konforme Pflichtangaben.
 *
 * Hinweis: Die EU/DE-TMG-Bezüge des Vorgängers wurden entfernt, weil das
 * Unternehmen in Kasachstan registriert ist. Pflichtangaben orientieren
 * sich am Закон РК «О защите прав потребителей» und «Об электронной
 * коммерции» (Закон РК от 24.05.2024). Wenn EU-Verbraucher bedient werden,
 * Block "Юрисдикция ЕС" einblenden (ODR-Plattform-Link).
 *
 * Die einzelnen Felder kommen aus der Admin-Tabelle "affiliate_einstellungen"
 * (firma_*). Solange diese leer sind, zeigt die Seite eine Hinweis-Box.
 * ────────────────────────────────────────────────────────────────────────── */
export default async function ImpressumPage() {
  const sys = await systemEinstellungenLaden();
  const hasMinimalData = Boolean(sys.firma_strasse && sys.firma_ort);

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--color-paper)" }}>
      <SiteHeader />
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-7" style={{ color: "var(--color-ink)" }}>

        <header className="pb-6" style={{ borderBottom: "1px solid var(--color-line)" }}>
          <p className="text-[11px] uppercase font-medium mb-2" style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}>
            Реквизиты
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   "clamp(2rem, 5vw, 3rem)",
              color:      "var(--color-ink)",
              lineHeight: 1,
            }}
          >
            Реквизиты компании
          </h1>
          <p
            className="mt-3 text-sm"
            style={{
              fontFamily: "var(--font-italic)",
              fontStyle:  "italic",
              color:      "var(--color-ink-soft)",
            }}
          >
            Согласно Закону РК «О защите прав потребителей» и Закону РК «Об электронной коммерции».
          </p>
        </header>

        {!hasMinimalData && (
          <div
            className="p-4"
            style={{
              background: "rgba(232,112,58,0.08)",
              border:     "1px solid rgba(232,112,58,0.35)",
              borderLeft: "3px solid var(--color-coral)",
              color:      "var(--color-ink-soft)",
              fontSize:   13,
            }}
          >
            <b style={{ color: "var(--color-ink)" }}>Внимание администратору:</b>{" "}
            Реквизиты компании не заполнены в админ-панели. Поля{" "}
            <code style={{ background: "#fff", padding: "1px 4px", border: "1px solid var(--color-line)" }}>
              firma_strasse
            </code>,{" "}
            <code style={{ background: "#fff", padding: "1px 4px", border: "1px solid var(--color-line)" }}>
              firma_ort
            </code>,{" "}
            <code style={{ background: "#fff", padding: "1px 4px", border: "1px solid var(--color-line)" }}>
              firma_telefon
            </code>{" "}
            и др. в разделе «Настройки» необходимо заполнить.
          </div>
        )}

        <article className="space-y-7 text-sm leading-relaxed">

          <Section title="Продавец (юридическое лицо)">
            <p style={{ color: "var(--color-ink)" }}>
              {sys.firma_name || "Galerie du Temps"}<br/>
              {sys.firma_strasse && <>{sys.firma_strasse}<br/></>}
              {(sys.firma_plz || sys.firma_ort) && <>{[sys.firma_plz, sys.firma_ort].filter(Boolean).join(" ")}<br/></>}
              {sys.firma_land || "Республика Казахстан"}
            </p>
          </Section>

          <Section title="Контактные данные">
            <p>
              {sys.firma_email && (
                <>E-mail:{" "}
                  <a
                    href={`mailto:${sys.firma_email}`}
                    style={{ color: "var(--color-coral)", textDecoration: "underline", textUnderlineOffset: 2 }}
                  >
                    {sys.firma_email}
                  </a>
                  <br/>
                </>
              )}
              {!sys.firma_email && (
                <>E-mail:{" "}
                  <a
                    href="mailto:bonjour@galeriedutemps.kz"
                    style={{ color: "var(--color-coral)", textDecoration: "underline", textUnderlineOffset: 2 }}
                  >
                    bonjour@galeriedutemps.kz
                  </a>
                  <br/>
                </>
              )}
              {sys.firma_telefon && (
                <>Телефон:{" "}
                  <a
                    href={`tel:+${sys.firma_telefon.replace(/\D/g, "")}`}
                    style={{ color: "var(--color-coral)" }}
                  >
                    {sys.firma_telefon}
                  </a>
                </>
              )}
            </p>
          </Section>

          {(sys.firma_steuer_id || sys.firma_ust_id || sys.firma_handelsregister) && (
            <Section title="Регистрационные данные">
              {sys.firma_handelsregister && <p>БИН / Регистрационный номер: <b style={{ color: "var(--color-ink)" }}>{sys.firma_handelsregister}</b></p>}
              {sys.firma_steuer_id       && <p>ИИН / Налоговый номер: <b style={{ color: "var(--color-ink)" }}>{sys.firma_steuer_id}</b></p>}
              {sys.firma_ust_id          && <p>НДС-номер: <b style={{ color: "var(--color-ink)" }}>{sys.firma_ust_id}</b></p>}
            </Section>
          )}

          <Section title="Ответственность за содержание">
            <p>
              За содержание данного сайта отвечает {sys.firma_name || "Galerie du Temps"}.
              Все товары проходят атрибуцию и реставрацию. Описания, фотографии и атрибуции
              предоставляются по принципу добросовестности.
            </p>
          </Section>

          <Section title="Авторские права">
            <p>
              Все тексты, фотографии и графические материалы на этом сайте защищены
              авторским правом. Использование возможно только с письменного разрешения
              правообладателя. © {new Date().getFullYear()} {sys.firma_name || "Galerie du Temps"}.
            </p>
          </Section>

          <Section title="Возврат и обмен">
            <p>
              Покупатель имеет право вернуть товар надлежащего качества в течение 14 дней
              с момента передачи в соответствии со статьёй 30 Закона РК «О защите прав
              потребителей». Возврат не распространяется на товары, изготовленные на заказ.
              Подробности — на странице <a href="/datenschutz" style={{ color: "var(--color-coral)", textDecoration: "underline", textUnderlineOffset: 2 }}>условий возврата</a>.
            </p>
          </Section>

          <Section title="Разрешение споров">
            <p>
              Все споры между Продавцом и Покупателем разрешаются путём переговоров.
              При невозможности достижения согласия — в судебном порядке по месту
              нахождения Продавца в соответствии с законодательством Республики Казахстан.
            </p>
          </Section>

        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2
        className="mb-2"
        style={{
          fontFamily: "var(--font-display)",
          fontSize:   20,
          color:      "var(--color-ink)",
        }}
      >
        {title}
      </h2>
      <div style={{ color: "var(--color-ink-soft)" }}>{children}</div>
    </section>
  );
}
