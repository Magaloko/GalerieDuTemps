import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { affiliateById } from "@/lib/db/affiliates";
import { provisionsSummenFuer } from "@/lib/db/provisionen";
import { klickStatsFuerAffiliate, klickTimeline } from "@/lib/db/affiliate-tracking";
import { TimelineChart } from "@/components/charts/timeline-chart";
import { formatPreis } from "@/lib/utils/preis";
import Link from "next/link";
import { Coins, MousePointerClick, Users, Wallet, ArrowRight, Link2 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Übersicht" };
export const dynamic = "force-dynamic";

export default async function AffiliateDashboard() {
  const session = await auth();
  if (!session || session.user?.role !== "affiliate") redirect("/affiliate/anmelden");

  const id = session.user.id;
  const [affiliate, summen, klickStats, timeline] = await Promise.all([
    affiliateById(id),
    provisionsSummenFuer(id).catch(() => null),
    klickStatsFuerAffiliate(id).catch(() => null),
    klickTimeline(id, 30).catch(() => []),
  ]);

  if (!affiliate) redirect("/affiliate/anmelden");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-vintage-gold text-sm tracking-widest">✦</p>
        <h1 className="font-serif text-3xl text-vintage-cream mt-1">
          Hallo {affiliate.vorname}!
        </h1>
        <p className="text-vintage-dust text-sm font-sans mt-1">
          Übersicht über deine Aktivität und Verdienste
        </p>
      </div>

      {/* Stat-Karten */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatKarte
          label="Offene Provision"
          wert={summen ? formatPreis(summen.offen_cent / 100) : "–"}
          unter={summen ? `${summen.anzahl_offen} Verkäufe` : ""}
          icon={Coins}
          color="gold"
        />
        <StatKarte
          label="Bestätigt"
          wert={summen ? formatPreis(summen.bestaetigt_cent / 100) : "–"}
          unter={summen ? `${summen.anzahl_bestaetigt} bereit zur Auszahlung` : ""}
          icon={Wallet}
          color="sage"
          href="/affiliate/auszahlungen"
        />
        <StatKarte
          label="Klicks (30 Tage)"
          wert={klickStats?.letzte_30 ?? "–"}
          unter={klickStats ? `${klickStats.heute} heute` : ""}
          icon={MousePointerClick}
          color="copper"
        />
        <StatKarte
          label="Insgesamt verdient"
          wert={summen ? formatPreis((summen.bestaetigt_cent + summen.ausgezahlt_cent) / 100) : "–"}
          unter={summen ? formatPreis(summen.ausgezahlt_cent / 100) + " ausgezahlt" : ""}
          icon={Users}
          color="burgundy"
        />
      </div>

      {/* Inventar-Wert Card */}
      <div className="bg-vintage-espresso text-vintage-cream p-6 grid md:grid-cols-3 gap-6" style={{ borderRadius: "var(--radius-card)" }}>
        <div>
          <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">Dein Code</p>
          <p className="font-mono text-2xl text-vintage-gold tracking-widest">{affiliate.referral_code}</p>
          <p className="text-vintage-cream/60 text-xs mt-1 font-sans">Teile diesen Code oder Links</p>
        </div>
        <div>
          <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">Conversion-Rate</p>
          <p className="font-serif text-2xl">
            {klickStats && klickStats.letzte_30 > 0 && summen
              ? ((summen.anzahl_offen + summen.anzahl_bestaetigt + summen.anzahl_ausgezahlt) / klickStats.letzte_30 * 100).toFixed(1)
              : "0.0"}%
          </p>
          <p className="text-vintage-cream/60 text-xs mt-1 font-sans">Klicks → Verkäufe (30 Tage)</p>
        </div>
        <div className="flex items-end">
          <Link href="/affiliate/links" className="inline-flex items-center gap-2 px-5 py-3 bg-vintage-gold text-vintage-cream font-sans text-xs tracking-widest uppercase hover:bg-vintage-copper transition-colors" style={{ borderRadius: "var(--radius-button)" }}>
            <Link2 className="w-3.5 h-3.5" /> Neuen Link erstellen
          </Link>
        </div>
      </div>

      {/* Klicks Timeline */}
      <section className="bg-vintage-brown border border-vintage-sand/40 p-6" style={{ borderRadius: "var(--radius-card)" }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-serif text-lg text-vintage-cream">Klicks – letzte 30 Tage</h2>
            <p className="text-vintage-dust text-xs font-sans">Tägliche Klicks auf deine Empfehlungs-Links</p>
          </div>
        </div>
        {timeline.length > 0
          ? <TimelineChart data={timeline.map(t => ({ datum: t.datum, anzahl: t.klicks }))} label="Klicks" />
          : <p className="text-center text-vintage-dust py-12 text-sm font-sans">Noch keine Klicks</p>
        }
      </section>

      {/* Schnellzugriff */}
      <div className="bg-vintage-brown border border-vintage-sand/40 p-6" style={{ borderRadius: "var(--radius-card)" }}>
        <h2 className="font-serif text-lg text-vintage-cream mb-5">Schnellzugriff</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { href: "/affiliate/links",        label: "Link erstellen",  icon: Link2 },
            { href: "/affiliate/provisionen",  label: "Provisionen",     icon: Coins },
            { href: "/affiliate/downline",     label: "Meine Partner",   icon: Users },
            { href: "/affiliate/marketing",    label: "Marketing-Material", icon: ArrowRight },
          ].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-4 py-3 text-sm font-sans text-vintage-cream/80 border border-vintage-sand/30 hover:bg-vintage-brown/40 hover:border-vintage-sand/40 transition-colors"
              style={{ borderRadius: "var(--radius-vintage)" }}>
              <Icon className="w-4 h-4 text-vintage-gold" /> {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatKarte({ label, wert, unter, icon: Icon, color, href }: {
  label: string; wert: string | number; unter?: string; icon: React.ElementType;
  color: "gold" | "sage" | "burgundy" | "copper"; href?: string;
}) {
  const colorMap = {
    gold:     "text-vintage-gold     bg-vintage-gold/10     border-vintage-gold/20",
    sage:     "text-vintage-sage     bg-vintage-sage/10     border-vintage-sage/20",
    burgundy: "text-vintage-burgundy bg-vintage-burgundy/10 border-vintage-burgundy/20",
    copper:   "text-vintage-copper   bg-vintage-copper/10   border-vintage-copper/20",
  };
  const card = (
    <div className="bg-vintage-brown border border-vintage-sand/40 p-6" style={{ borderRadius: "var(--radius-card)" }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-sans uppercase tracking-widest text-vintage-dust mb-1">{label}</p>
          <p className="font-serif text-2xl text-vintage-cream">{wert}</p>
          {unter && <p className="text-xs text-vintage-dust mt-1 font-sans">{unter}</p>}
        </div>
        <div className={`p-3 border ${colorMap[color]}`} style={{ borderRadius: "var(--radius-card)" }}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}
