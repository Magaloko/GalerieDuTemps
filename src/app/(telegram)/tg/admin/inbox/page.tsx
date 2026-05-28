import Link from "next/link";
import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { TelegramAuthGate } from "../../auth-gate";
import { leadsListe } from "@/lib/db/leads";
import { Inbox, ChevronLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:  "Inbox · Mini-App",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /tg/admin/inbox — kompakter Lead-Browser für Admin im Mini-App.
 *
 * Zeigt die 20 zuletzt eingegangenen Leads (status='neu' oder 'in_arbeit')
 * mit Quelle-Badge + Vorschau-Snippet + Zeit. Klick öffnet die WEB-Detail-
 * Page in einem neuen Tab — Mini-App-Inline-Detail ist Phase 2 weil
 * Reply-Form mit Anhängen + Vorlagen besser auf Desktop ist.
 *
 * Wenn kein Admin → Redirect-Hint.
 * ────────────────────────────────────────────────────────────────────────── */
export default async function TgAdminInboxPage() {
  const session = await getWebAppSession();
  if (!session || session.role !== "admin") {
    return (
      <TelegramAuthGate>
        <NotAdmin />
      </TelegramAuthGate>
    );
  }

  // leadsListe akzeptiert nur EINEN Status — wir zeigen „offen" als
  // Pseudo-Filter (entspricht neu + gelesen + in_arbeit).
  const { items: leads } = await leadsListe({
    status: "offen",
    limit:  20,
  }).catch(() => ({ items: [], total: 0 }));

  return (
    <TelegramAuthGate>
      <main className="p-4">
        {/* Back */}
        <Link
          href="/tg/admin"
          className="inline-flex items-center gap-1 mb-4 text-[11px] uppercase font-medium"
          style={{
            letterSpacing: "0.18em",
            color:         "var(--tg-theme-link-color, var(--color-coral))",
          }}
        >
          <ChevronLeft className="w-3 h-3" /> Назад
        </Link>

        <header className="mb-5">
          <p
            className="flex items-center gap-2 text-[10px] uppercase font-medium mb-1"
            style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
          >
            <Inbox className="w-3 h-3" /> Inbox
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   24,
              color:      "var(--tg-theme-text-color, var(--color-ink))",
              lineHeight: 1.1,
            }}
          >
            Открытые сообщения
          </h1>
          <p
            className="mt-1 text-xs"
            style={{
              fontFamily: "var(--font-italic)",
              fontStyle:  "italic",
              color:      "var(--tg-theme-hint-color, var(--color-ink-soft))",
            }}
          >
            {leads.length} {leads.length === 1 ? "лид" : leads.length < 5 ? "лида" : "лидов"}
          </p>
        </header>

        {leads.length === 0 ? (
          <div
            className="p-6 text-center"
            style={{
              background: "var(--tg-theme-section-bg-color, #fff)",
              border:     "1px solid var(--color-line)",
            }}
          >
            <Inbox className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--color-ink-mute)" }} />
            <p
              className="text-sm"
              style={{
                fontFamily: "var(--font-italic)",
                fontStyle:  "italic",
                color:      "var(--tg-theme-hint-color, var(--color-ink-soft))",
              }}
            >
              Все сообщения обработаны.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {leads.map(l => (
              <li key={l.id}>
                <a
                  href={`/admin/leads/${l.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3"
                  style={{
                    background:  "var(--tg-theme-section-bg-color, #fff)",
                    border:      "1px solid var(--color-line)",
                    borderLeft:  `3px solid ${
                      l.prioritaet === "dringend" ? "var(--color-coral)"
                      : l.prioritaet === "hoch"    ? "#C9A84C"
                      : "var(--color-line)"
                    }`,
                    touchAction: "manipulation",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-[9px] uppercase font-medium px-1.5 py-0.5"
                        style={{
                          letterSpacing: "0.18em",
                          background:    "var(--color-bone)",
                          color:         "var(--tg-theme-hint-color, var(--color-ink-mute))",
                        }}
                      >
                        {l.quelle}
                      </span>
                      <span
                        className="text-xs truncate"
                        style={{
                          fontFamily: "var(--font-display)",
                          color:      "var(--tg-theme-text-color, var(--color-ink))",
                        }}
                      >
                        {l.kontakt_name ?? l.kontakt_handle ?? l.kontakt_email ?? "—"}
                      </span>
                    </div>
                    {l.betreff && (
                      <p
                        className="text-xs truncate"
                        style={{
                          color: "var(--tg-theme-text-color, var(--color-ink))",
                        }}
                      >
                        {l.betreff}
                      </p>
                    )}
                    {l.vorschau && (
                      <p
                        className="text-[11px] line-clamp-2 mt-0.5"
                        style={{
                          fontFamily: "var(--font-italic)",
                          fontStyle:  "italic",
                          color:      "var(--tg-theme-hint-color, var(--color-ink-mute))",
                        }}
                      >
                        {l.vorschau}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 opacity-40 shrink-0 mt-1" />
                </a>
              </li>
            ))}
          </ul>
        )}

        <p
          className="mt-4 text-[10px] text-center"
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--tg-theme-hint-color, var(--color-ink-mute))",
          }}
        >
          Ответ удобнее писать на десктопе — клик открывает полную форму.
        </p>
      </main>
    </TelegramAuthGate>
  );
}

function NotAdmin() {
  return (
    <main className="p-6 text-center min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <Inbox className="w-10 h-10" style={{ color: "var(--color-ink-mute)" }} />
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize:   18,
          color:      "var(--tg-theme-text-color, var(--color-ink))",
        }}
      >
        Только для администраторов
      </p>
      <Link
        href="/tg"
        className="text-[11px] uppercase font-medium"
        style={{ letterSpacing: "0.22em", color: "var(--color-coral)" }}
      >
        ← В каталог
      </Link>
    </main>
  );
}
