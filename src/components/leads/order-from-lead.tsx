"use client";

import { useState, useTransition } from "react";
import { ShoppingBag, Search, Loader2, AlertCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import {
  produktSuchenAction, leadZuBestellungAction,
  type ProduktSuchTreffer, type ActionResult,
} from "@/app/(admin)/admin/leads/actions";
import { formatPreis } from "@/lib/utils/preis";

interface Props { leadId: string; hatEmail: boolean }

export function OrderFromLead({ leadId, hatEmail }: Props) {
  const [open, setOpen]   = useState(false);
  const [q, setQ]         = useState("");
  const [results, setResults] = useState<ProduktSuchTreffer[]>([]);
  const [selected, setSelected] = useState<ProduktSuchTreffer | null>(null);
  const [menge, setMenge] = useState(1);
  const [searchPending, startSearch] = useTransition();
  const [createPending, startCreate] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const search = (val: string) => {
    setQ(val);
    if (val.length < 1) { setResults([]); return; }
    startSearch(async () => {
      const r = await produktSuchenAction(val);
      setResults(r);
    });
  };

  const submit = () => {
    if (!selected) { setError("Товар не выбран"); return; }
    setError(null);
    startCreate(async () => {
      const r: ActionResult = await leadZuBestellungAction(leadId, selected.id, menge);
      // ActionResult ok-true bedeutet KEIN redirect → meist Error/Message-Fall
      // Bei Success geht Server-Action via redirect() weiter, kommt also gar nicht zurück
      if (!r.ok) setError(r.error);
    });
  };

  if (!hatEmail) {
    return (
      <section className="bg-vintage-parchment border border-vintage-sand p-5"
               style={{ borderRadius: "var(--radius-card)" }}>
        <h3 className="font-serif text-base text-vintage-espresso mb-2 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-vintage-gold" /> Создать заказ
        </h3>
        <p className="text-xs text-vintage-dust">
          У лида нет e-mail — сначала создайте и привяжите клиента выше.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-vintage-white border border-vintage-gold/40 p-5 space-y-4"
             style={{ borderRadius: "var(--radius-card)" }}>
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-base text-vintage-espresso flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-vintage-gold" /> Создать заказ из лида
        </h3>
        {!open && (
          <Button size="sm" onClick={() => setOpen(true)}
                  icon={<ShoppingBag className="w-3.5 h-3.5" />}>
            Начать
          </Button>
        )}
      </div>

      {open && (
        <div className="space-y-4">
          {/* Produkt-Suche */}
          {!selected && (
            <div className="space-y-2">
              <Input
                label="Найти товар"
                value={q}
                onChange={(e) => search(e.target.value)}
                placeholder="Название, slug или артикул …"
              />
              {searchPending && (
                <div className="flex items-center gap-2 text-xs text-vintage-dust">
                  <Loader2 className="w-3 h-3 animate-spin" /> Поиск …
                </div>
              )}
              {results.length > 0 && (
                <div className="border border-vintage-sand max-h-64 overflow-y-auto"
                     style={{ borderRadius: "var(--radius-vintage)" }}>
                  {results.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setSelected(p); setResults([]); setQ(""); }}
                      className="w-full flex items-center gap-3 p-2 hover:bg-vintage-parchment border-b border-vintage-sand/40 last:border-0 text-left">
                      <div className="w-10 h-10 bg-vintage-parchment overflow-hidden flex-shrink-0"
                           style={{ borderRadius: "var(--radius-vintage)" }}>
                        {p.hauptbild_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.hauptbild_url} alt="" className="w-full h-full object-cover" />
                        ) : <Package className="w-4 h-4 text-vintage-sand m-auto mt-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-vintage-ink truncate">{p.name}</p>
                        <p className="text-xs text-vintage-dust">
                          {p.artikel_code && `${p.artikel_code} · `}
                          На складе: {p.lagerbestand}
                        </p>
                      </div>
                      <p className="font-serif text-sm text-vintage-espresso flex-shrink-0">
                        {formatPreis(p.preis)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              {q.length > 0 && results.length === 0 && !searchPending && (
                <p className="text-xs text-vintage-dust">Ничего не найдено</p>
              )}
            </div>
          )}

          {/* Ausgewähltes Produkt */}
          {selected && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-vintage-parchment p-3"
                   style={{ borderRadius: "var(--radius-vintage)" }}>
                <div className="flex items-center gap-3 min-w-0">
                  {selected.hauptbild_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={selected.hauptbild_url} alt="" className="w-10 h-10 object-cover"
                         style={{ borderRadius: "var(--radius-vintage)" }} />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm text-vintage-ink truncate">{selected.name}</p>
                    <p className="text-xs text-vintage-dust">
                      {formatPreis(selected.preis)} · на складе {selected.lagerbestand}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)}
                        className="text-xs text-vintage-burgundy hover:underline">
                  Изменить
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Input
                  label="Количество"
                  type="number" min={1} max={selected.lagerbestand}
                  value={menge}
                  onChange={(e) => setMenge(Math.max(1, Math.min(selected.lagerbestand, parseInt(e.target.value) || 1)))}
                />
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-sans uppercase tracking-widest text-vintage-gold/80">Итого</span>
                  <span className="font-serif text-lg text-vintage-espresso py-2">
                    {formatPreis(selected.preis * menge)}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-sans uppercase tracking-widest text-vintage-gold/80">Inkl. NDS</span>
                  <span className="text-xs text-vintage-dust py-2">12 % KZ</span>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-vintage-burgundy">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={submit} loading={createPending}
                        icon={<ShoppingBag className="w-3.5 h-3.5" />}>
                  Создать заказ (ожидает)
                </Button>
                <Button variant="ghost" onClick={() => { setSelected(null); setOpen(false); }}>
                  Отмена
                </Button>
              </div>
              <p className="text-xs text-vintage-dust">
                Заказ будет создан в статусе &quot;Ожидает&quot;. Затем его можно доработать в /admin/bestellungen.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
