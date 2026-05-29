import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { downlineLaden } from "@/lib/db/affiliates";
import { Users } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Мои партнёры" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { text: string; klasse: string }> = {
  pending:    { text: "Ожидает активации",         klasse: "text-vintage-gold     bg-vintage-gold/10"     },
  aktiv:      { text: "Активен",                    klasse: "text-vintage-sage     bg-vintage-sage/10"     },
  gesperrt:   { text: "Заблокирован",               klasse: "text-vintage-burgundy bg-vintage-burgundy/10" },
  geloescht:  { text: "Удалён",                      klasse: "text-vintage-dust     bg-vintage-dust/10"     },
};

export default async function DownlinePage() {
  const session = await auth();
  if (!session) redirect("/affiliate/anmelden");

  const downline = await downlineLaden(session.user.id);
  const ebene1   = downline.filter(d => d.ebene_relativ === 1);
  const ebene2   = downline.filter(d => d.ebene_relativ === 2);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-3xl text-vintage-cream">Мои партнёры</h1>
        <p className="text-vintage-dust text-sm font-sans mt-1">
          {ebene1.length} приглашены напрямую · {ebene2.length} косвенно
        </p>
      </div>

      {downline.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-vintage-brown border border-vintage-sand/40" style={{ borderRadius: "var(--radius-card)" }}>
          <Users className="w-10 h-10 text-vintage-sand mb-3" />
          <p className="font-serif text-lg text-vintage-cream/80">Приглашённых партнёров пока нет</p>
          <p className="text-vintage-dust text-sm font-sans mt-1 max-w-xs">
            Поделитесь своим реферальным кодом и зарабатывайте также на продажах ваших партнёров.
          </p>
        </div>
      ) : (
        <>
          {/* Ebene 1 */}
          <section className="bg-vintage-brown border border-vintage-sand/40 p-6" style={{ borderRadius: "var(--radius-card)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg text-vintage-cream">Приглашены напрямую (уровень 1)</h2>
              <span className="text-xs text-vintage-dust font-sans">{ebene1.length} партнёров</span>
            </div>
            {ebene1.length === 0
              ? <p className="text-vintage-dust text-sm font-sans py-4 text-center">Прямых партнёров пока нет</p>
              : <DownlineListe items={ebene1} />
            }
          </section>

          {/* Ebene 2 */}
          {ebene2.length > 0 && (
            <section className="bg-vintage-brown border border-vintage-sand/40 p-6" style={{ borderRadius: "var(--radius-card)" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-lg text-vintage-cream">Косвенно (уровень 2)</h2>
                <span className="text-xs text-vintage-dust font-sans">{ebene2.length} партнёров</span>
              </div>
              <DownlineListe items={ebene2} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

function DownlineListe({ items }: { items: Awaited<ReturnType<typeof downlineLaden>> }) {
  return (
    <div className="divide-y divide-vintage-sand/40">
      {items.map(p => {
        const status = STATUS_LABEL[p.status] ?? STATUS_LABEL.aktiv;
        return (
          <div key={p.id} className="py-3 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-serif text-vintage-cream truncate">{p.vorname} {p.nachname}</p>
              <p className="text-xs text-vintage-dust font-sans">
                С {new Date(p.erstellt_am).toLocaleDateString("ru-RU")}
              </p>
            </div>
            <span className={`inline-block px-2 py-0.5 text-xs font-sans ${status.klasse}`}
              style={{ borderRadius: "var(--radius-vintage)" }}>
              {status.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}
