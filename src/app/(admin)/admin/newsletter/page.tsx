import Link from "next/link";
import { alleNewsletters, alleSubscribers } from "@/lib/db/newsletter";
import { Mail, Plus, Users, ExternalLink, Send } from "lucide-react";
import { NewNewsletterForm } from "./new-newsletter-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Newsletter" };
export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  entwurf:    "text-vintage-dust    bg-vintage-dust/10",
  geplant:    "text-vintage-gold    bg-vintage-gold/10",
  versendet:  "text-vintage-sage    bg-vintage-sage/10",
  abgebrochen:"text-vintage-burgundy bg-vintage-burgundy/10",
};

export default async function NewsletterAdminPage() {
  const [newsletters, subs] = await Promise.all([
    alleNewsletters(),
    alleSubscribers({ nur_aktive: true }),
  ]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-vintage-gold" />
          <div>
            <p className="text-vintage-gold text-xs tracking-widest">✦</p>
            <h1 className="font-serif text-2xl text-vintage-espresso">Newsletter</h1>
            <p className="text-vintage-dust text-xs font-sans mt-0.5">{newsletters.length} Newsletter · {subs.aktive} aktive Abonnent:innen</p>
          </div>
        </div>
        <Link href="/admin/newsletter/subscribers"
          className="flex items-center gap-2 px-4 py-2 border border-vintage-sand text-vintage-brown text-xs font-sans uppercase tracking-widest hover:bg-vintage-parchment transition-colors"
          style={{ borderRadius: "var(--radius-button)" }}>
          <Users className="w-3.5 h-3.5" /> Abonnent:innen
        </Link>
      </div>

      <NewNewsletterForm />

      {newsletters.length === 0 ? (
        <div className="text-center py-12 bg-vintage-white border border-vintage-sand" style={{ borderRadius: "var(--radius-card)" }}>
          <Mail className="w-10 h-10 text-vintage-sand mx-auto mb-3" />
          <p className="font-serif text-vintage-brown">Noch keine Newsletter</p>
        </div>
      ) : (
        <div className="space-y-2">
          {newsletters.map(n => (
            <Link key={n.id} href={`/admin/newsletter/${n.id}/edit`}
              className="flex items-center justify-between p-4 bg-vintage-white border border-vintage-sand hover:border-vintage-brown transition-colors"
              style={{ borderRadius: "var(--radius-card)" }}>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-serif text-vintage-espresso">{n.titel}</p>
                  <span className={`px-2 py-0.5 text-xs ${STATUS_STYLE[n.status]}`} style={{ borderRadius: "var(--radius-vintage)" }}>
                    {n.status}
                  </span>
                </div>
                <p className="text-xs text-vintage-dust font-sans mt-0.5">Betreff: {n.betreff}</p>
                {n.status === "versendet" && (
                  <p className="text-xs text-vintage-dust font-sans mt-0.5">
                    Versendet am {n.versendet_am && new Date(n.versendet_am).toLocaleDateString("de-DE")}
                    · {n.empfaenger_anzahl} Empfänger
                    {n.geoeffnet_anzahl > 0 && ` · ${n.geoeffnet_anzahl} geöffnet`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {n.status === "entwurf" && <Send className="w-4 h-4 text-vintage-gold" />}
                <ExternalLink className="w-4 h-4 text-vintage-dust" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
