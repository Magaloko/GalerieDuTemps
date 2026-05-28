import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { customerById } from "@/lib/db/customers";
import { alleDiscountTiers } from "@/lib/db/customer-b2b";
import { formatPreis } from "@/lib/utils/preis";
import { Briefcase, CheckCircle2, Clock, XCircle, TrendingUp } from "lucide-react";
import { B2bAntragsFormular } from "./b2b-formular";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "B2B-статус" };
export const dynamic = "force-dynamic";

export default async function B2bSeitePage() {
  const session = await auth();
  if (!session || session.user?.role !== "customer") redirect("/kunde/anmelden");

  const [customer, tiers] = await Promise.all([
    customerById(session.user.id),
    alleDiscountTiers(),
  ]);
  if (!customer) redirect("/kunde/anmelden");

  const b2bTiers = tiers.filter(t => t.customer_type === "b2b_verified");

  return (
    <div className="max-w-3xl space-y-6">

      {/* Header */}
      <header>
        <p
          className="text-[11px] uppercase font-medium mb-2"
          style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
        >
          ✦ Бизнес
        </p>
        <h1
          className="flex items-center gap-3"
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   "clamp(1.875rem, 3.5vw, 2.25rem)",
            color:      "var(--color-ink)",
            lineHeight: 1.05,
          }}
        >
          <Briefcase className="w-6 h-6" style={{ color: "var(--color-coral)" }} />
          B2B-статус
        </h1>
      </header>

      {/* ─── Status-Cards ──────────────────────────────────── */}

      {customer.customer_type === "b2b_verified" && (
        <StatusCard
          icon={CheckCircle2}
          color="#52663F"
          background="rgba(127,140,90,0.10)"
          border="rgba(127,140,90,0.40)"
          title="B2B-аккаунт активен"
          description="Вы видите оптовые цены, скидки по объёму применяются автоматически."
        >
          <Meta>
            <p><strong>Компания:</strong> {customer.company_name}</p>
            {customer.ust_id && <p><strong>ИИН/БИН:</strong> {customer.ust_id}</p>}
          </Meta>
        </StatusCard>
      )}

      {customer.customer_type === "b2b_pending" && (
        <StatusCard
          icon={Clock}
          color="#C9A84C"
          background="rgba(201,168,76,0.10)"
          border="rgba(201,168,76,0.40)"
          title="Заявка на рассмотрении"
          description="Проверяем заявку в течение 1-2 рабочих дней. Сообщим на e-mail после активации."
        >
          <Meta>
            <p><strong>Компания:</strong> {customer.company_name}</p>
            {customer.ust_id && <p><strong>ИИН/БИН:</strong> {customer.ust_id}</p>}
          </Meta>
        </StatusCard>
      )}

      {customer.customer_type === "b2b_rejected" && (
        <StatusCard
          icon={XCircle}
          color="var(--color-coral-deep, #A53E26)"
          background="rgba(232,112,58,0.08)"
          border="rgba(232,112,58,0.35)"
          title="Заявка отклонена"
          description="Вы можете продолжать покупать как частное лицо. Снизу можно подать новую заявку."
        >
          {customer.company_note && (
            <pre
              className="text-xs whitespace-pre-wrap p-3 mt-2"
              style={{
                fontFamily: "var(--font-mono)",
                background: "var(--color-bone)",
                color:      "var(--color-ink-soft)",
                border:     "1px solid var(--color-line)",
              }}
            >
              {customer.company_note}
            </pre>
          )}
        </StatusCard>
      )}

      {/* ─── Rabattstaffel ─────────────────────────────────── */}
      {customer.customer_type === "b2b_verified" && b2bTiers.length > 0 && (
        <section
          className="p-6"
          style={{ background: "#fff", border: "1px solid var(--color-line)" }}
        >
          <h2
            className="flex items-center gap-2 mb-4 text-[11px] uppercase font-medium"
            style={{ letterSpacing: "0.22em", color: "var(--color-ink)" }}
          >
            <TrendingUp className="w-3.5 h-3.5" style={{ color: "var(--color-coral)" }} />
            Скидки за объём
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {b2bTiers.map(t => (
              <div
                key={t.id}
                className="p-4 text-center"
                style={{
                  background: "var(--color-bone)",
                  border:     "1px solid var(--color-line)",
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize:   28,
                    color:      "var(--color-coral)",
                    lineHeight: 1,
                  }}
                >
                  {t.rabatt_prozent}%
                </p>
                <p
                  className="text-[11px] mt-1.5"
                  style={{
                    fontFamily: "var(--font-italic)",
                    fontStyle:  "italic",
                    color:      "var(--color-ink-mute)",
                  }}
                >
                  от {formatPreis(t.min_summe_cent / 100)}
                </p>
              </div>
            ))}
          </div>
          <p
            className="text-[11px] text-center mt-3"
            style={{
              fontFamily: "var(--font-italic)",
              fontStyle:  "italic",
              color:      "var(--color-ink-mute)",
            }}
          >
            Применяется к корзине автоматически.
          </p>
        </section>
      )}

      {/* ─── Antrags-Formular ──────────────────────────────── */}
      {(customer.customer_type === "b2c" || customer.customer_type === "b2b_rejected") && (
        <section
          className="p-6 space-y-4"
          style={{ background: "#fff", border: "1px solid var(--color-line)" }}
        >
          <h2
            className="flex items-center gap-2 pb-3 text-[11px] uppercase font-medium"
            style={{
              letterSpacing: "0.22em",
              color:         "var(--color-ink)",
              borderBottom:  "1px solid var(--color-line)",
            }}
          >
            <Briefcase className="w-3.5 h-3.5" style={{ color: "var(--color-coral)" }} />
            {customer.customer_type === "b2c" ? "Подать B2B-заявку" : "Подать новую B2B-заявку"}
          </h2>
          <p
            className="text-sm"
            style={{
              fontFamily: "var(--font-italic)",
              fontStyle:  "italic",
              color:      "var(--color-ink-soft)",
              lineHeight: 1.6,
            }}
          >
            Как бизнес-клиент вы получаете оптовые цены и автоматические скидки за объём.
            Обязательно: название компании и ИИН/БИН (или обоснование при УСН).
          </p>
          <B2bAntragsFormular initial={{
            company_name: customer.company_name ?? "",
            ust_id:       customer.ust_id ?? "",
            company_note: "",
          }} />
        </section>
      )}
    </div>
  );
}

/* ── Sub-Components ─────────────────────────────────────────────────── */

function StatusCard({
  icon: Icon, color, background, border, title, description, children,
}: {
  icon:        React.ElementType;
  color:       string;
  background:  string;
  border:      string;
  title:       string;
  description: string;
  children?:   React.ReactNode;
}) {
  return (
    <section
      className="p-6"
      style={{
        background,
        border:     `1px solid ${border}`,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color }} />
        <div className="min-w-0 flex-1">
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   18,
              color:      "var(--color-ink)",
              lineHeight: 1.2,
            }}
          >
            {title}
          </h2>
          <p
            className="text-sm mt-1.5"
            style={{
              fontFamily: "var(--font-italic)",
              fontStyle:  "italic",
              color:      "var(--color-ink-soft)",
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
          {children}
        </div>
      </div>
    </section>
  );
}

function Meta({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-3 space-y-0.5 text-sm"
      style={{ color: "var(--color-ink-soft)" }}
    >
      {children}
    </div>
  );
}
