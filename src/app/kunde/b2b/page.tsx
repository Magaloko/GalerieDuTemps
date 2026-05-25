import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { customerById } from "@/lib/db/customers";
import { alleDiscountTiers } from "@/lib/db/customer-b2b";
import { formatPreis } from "@/lib/utils/preis";
import { Briefcase, CheckCircle2, Clock, XCircle, TrendingUp } from "lucide-react";
import { B2bAntragsFormular } from "./b2b-formular";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "B2B-Status" };
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
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-3xl text-vintage-espresso flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-vintage-gold" /> B2B-Status
        </h1>
      </div>

      {/* Status-Card */}
      {customer.customer_type === "b2b_verified" && (
        <section className="bg-vintage-sage/10 border border-vintage-sage/30 p-6" style={{ borderRadius: "var(--radius-card)" }}>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-vintage-sage flex-shrink-0" />
            <div>
              <h2 className="font-serif text-xl text-vintage-forest">B2B-Konto aktiv</h2>
              <p className="text-vintage-forest text-sm font-sans mt-1">
                Du siehst Großhandelspreise und nutzt automatisch Mengenrabatte.
              </p>
              <div className="mt-3 text-sm font-sans text-vintage-brown">
                <p><strong>Firma:</strong> {customer.company_name}</p>
                {customer.ust_id && <p><strong>USt-IdNr.:</strong> {customer.ust_id}</p>}
              </div>
            </div>
          </div>
        </section>
      )}

      {customer.customer_type === "b2b_pending" && (
        <section className="bg-vintage-gold/10 border border-vintage-gold/30 p-6" style={{ borderRadius: "var(--radius-card)" }}>
          <div className="flex items-start gap-3">
            <Clock className="w-6 h-6 text-vintage-gold flex-shrink-0" />
            <div>
              <h2 className="font-serif text-xl text-vintage-espresso">In Prüfung</h2>
              <p className="text-vintage-brown text-sm font-sans mt-1">
                Wir prüfen deinen B2B-Antrag innerhalb von 1-2 Werktagen. Du erhältst eine E-Mail bei Freischaltung.
              </p>
              <div className="mt-3 text-sm font-sans text-vintage-brown">
                <p><strong>Firma:</strong> {customer.company_name}</p>
                {customer.ust_id && <p><strong>USt-IdNr.:</strong> {customer.ust_id}</p>}
              </div>
            </div>
          </div>
        </section>
      )}

      {customer.customer_type === "b2b_rejected" && (
        <section className="bg-vintage-burgundy/10 border border-vintage-burgundy/30 p-6" style={{ borderRadius: "var(--radius-card)" }}>
          <div className="flex items-start gap-3">
            <XCircle className="w-6 h-6 text-vintage-burgundy flex-shrink-0" />
            <div>
              <h2 className="font-serif text-xl text-vintage-burgundy">Antrag abgelehnt</h2>
              <p className="text-vintage-burgundy text-sm font-sans mt-1">
                Du kannst weiterhin als Privatkund:in bei uns einkaufen. Unten kannst du einen neuen Antrag stellen.
              </p>
              {customer.company_note && (
                <pre className="text-xs text-vintage-brown font-sans bg-vintage-parchment p-3 mt-3 whitespace-pre-wrap" style={{ borderRadius: "var(--radius-vintage)" }}>
                  {customer.company_note}
                </pre>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Rabattstaffel-Anzeige */}
      {customer.customer_type === "b2b_verified" && b2bTiers.length > 0 && (
        <section className="bg-vintage-white border border-vintage-sand p-6" style={{ borderRadius: "var(--radius-card)" }}>
          <h2 className="font-serif text-lg text-vintage-espresso flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-vintage-gold" /> Deine Mengenrabatte
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {b2bTiers.map(t => (
              <div key={t.id} className="bg-vintage-parchment border border-vintage-sand p-4 text-center" style={{ borderRadius: "var(--radius-vintage)" }}>
                <p className="font-serif text-3xl text-vintage-gold">{t.rabatt_prozent}%</p>
                <p className="text-xs text-vintage-dust font-sans mt-1">ab {formatPreis(t.min_summe_cent / 100)}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-vintage-dust font-sans text-center mt-3">
            Wird automatisch auf den Warenkorb angewendet.
          </p>
        </section>
      )}

      {/* Antrags-Formular (für b2c oder b2b_rejected) */}
      {(customer.customer_type === "b2c" || customer.customer_type === "b2b_rejected") && (
        <section className="bg-vintage-white border border-vintage-sand p-6 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
          <h2 className="font-serif text-lg text-vintage-espresso border-b border-vintage-sand/50 pb-3">
            {customer.customer_type === "b2c" ? "B2B-Antrag stellen" : "Neuen B2B-Antrag stellen"}
          </h2>
          <p className="text-sm text-vintage-brown font-sans">
            Als Geschäftskund:in bekommst du Großhandelspreise + automatische Mengenrabatte.
            Pflicht: Firmenname und USt-IdNr. (oder Begründung bei Kleinunternehmer-Regelung).
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
