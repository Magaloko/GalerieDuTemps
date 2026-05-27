"use client";

import { useState, useTransition } from "react";
import {
  User, Mail, Search, Plus, X, Package, AlertCircle, CheckCircle2, Save, Loader2,
} from "lucide-react";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select }   from "@/components/ui/select";
import { Button }   from "@/components/ui/button";
import {
  customerSuchenAction, bestellungManuellAnlegenAction,
  type CustomerSuchTreffer, type ManuellBestellungInput,
} from "../actions";
import {
  produktSuchenAction,
  type ProduktSuchTreffer,
} from "@/app/(admin)/admin/leads/actions";
import { formatPreis } from "@/lib/utils/preis";

interface PickedItem extends ProduktSuchTreffer { menge: number }

const TAX_RATE = 12;

export function ManuellBestellungClient() {
  // Customer
  const [custMode, setCustMode] = useState<"search"|"new">("search");
  const [custQ, setCustQ]       = useState("");
  const [custResults, setCustResults] = useState<CustomerSuchTreffer[]>([]);
  const [custSelected, setCustSelected] = useState<CustomerSuchTreffer | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newName,  setNewName]  = useState("");
  const [custSearchPending, startCustSearch] = useTransition();

  // Produkte
  const [prodQ, setProdQ] = useState("");
  const [prodResults, setProdResults] = useState<ProduktSuchTreffer[]>([]);
  const [items, setItems] = useState<PickedItem[]>([]);
  const [prodSearchPending, startProdSearch] = useTransition();

  // Versand + Adresse + Notiz
  const [versandart, setVersandart] = useState<string>("standard");
  const [strasse, setStrasse] = useState("");
  const [plz, setPlz]         = useState("");
  const [ort, setOrt]         = useState("");
  const [land, setLand]       = useState("KZ");
  const [notiz, setNotiz]     = useState("");
  const [paid,  setPaid]      = useState(false);

  // Submit
  const [submitPending, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // ───────── Customer-Suche
  const searchCust = (v: string) => {
    setCustQ(v);
    if (v.length < 1) { setCustResults([]); return; }
    startCustSearch(async () => {
      const r = await customerSuchenAction(v);
      setCustResults(r);
    });
  };

  // ───────── Produkt-Suche
  const searchProd = (v: string) => {
    setProdQ(v);
    if (v.length < 1) { setProdResults([]); return; }
    startProdSearch(async () => {
      const r = await produktSuchenAction(v);
      setProdResults(r);
    });
  };

  const addItem = (p: ProduktSuchTreffer) => {
    if (items.find(i => i.id === p.id)) return;     // schon drin
    setItems(prev => [...prev, { ...p, menge: 1 }]);
    setProdQ(""); setProdResults([]);
  };

  const removeItem = (id: string) =>
    setItems(prev => prev.filter(i => i.id !== id));

  const updateMenge = (id: string, menge: number) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, menge: Math.max(1, Math.min(i.lagerbestand, menge)) } : i));

  // ───────── Totals
  const totalBrutto = items.reduce((sum, i) => sum + i.preis * i.menge, 0);
  const totalNetto  = totalBrutto / (1 + TAX_RATE/100);
  const totalTax    = totalBrutto - totalNetto;

  // ───────── Submit
  const submit = () => {
    setError(null);

    const email = (custSelected?.email ?? newEmail).toLowerCase().trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("E-mail клиента отсутствует или указан неверно");
      return;
    }
    if (items.length === 0) {
      setError("Выберите минимум 1 товар");
      return;
    }

    const name = custSelected
      ? [custSelected.vorname, custSelected.nachname].filter(Boolean).join(" ")
      : newName.trim();

    const payload: ManuellBestellungInput = {
      customer_id:    custSelected?.id,
      customer_email: email,
      customer_name:  name || undefined,
      items:          items.map(i => ({ produkt_id: i.id, menge: i.menge })),
      versandart,
      shipping_address: {
        strasse: strasse || undefined,
        plz:     plz     || undefined,
        ort:     ort     || undefined,
        land:    land    || "KZ",
      },
      kunden_notiz: notiz.trim() || undefined,
      status_paid:  paid,
    };

    startSubmit(async () => {
      const r = await bestellungManuellAnlegenAction(payload);
      if (!r.ok) setError(r.error);
      // Bei Erfolg: redirect() ist schon in der Action → wir kommen gar nicht hierhin
    });
  };

  return (
    <div className="space-y-6">

      {error && (
        <div className="flex items-start gap-3 px-5 py-4 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-sm text-vintage-burgundy"
             style={{ borderRadius: "var(--radius-card)" }}>
          <AlertCircle className="w-4 h-4 mt-0.5" /> {error}
        </div>
      )}

      {/* ─── Customer ──────────────────────────────────────────────── */}
      <section className="bg-vintage-white border border-vintage-sand p-6 space-y-4"
               style={{ borderRadius: "var(--radius-card)" }}>
        <div className="flex items-center justify-between border-b border-vintage-sand/50 pb-3">
          <h2 className="font-serif text-lg text-vintage-espresso flex items-center gap-2">
            <User className="w-4 h-4 text-vintage-gold" /> Клиент
          </h2>
          <div className="flex gap-1">
            {(["search","new"] as const).map(m => (
              <button key={m}
                      onClick={() => { setCustMode(m); setCustSelected(null); }}
                      className={`px-3 py-1 text-xs font-sans border transition-colors ${
                        custMode === m ? "bg-vintage-espresso text-vintage-cream border-vintage-espresso" : "border-vintage-sand text-vintage-brown"
                      }`}
                      style={{ borderRadius: "var(--radius-vintage)" }}>
                {m === "search" ? "Найти клиента" : "Новый клиент"}
              </button>
            ))}
          </div>
        </div>

        {custMode === "search" ? (
          custSelected ? (
            <div className="flex items-center justify-between bg-vintage-parchment p-3"
                 style={{ borderRadius: "var(--radius-vintage)" }}>
              <div>
                <p className="text-sm text-vintage-ink">
                  {[custSelected.vorname, custSelected.nachname].filter(Boolean).join(" ") || "Без имени"}
                  <span className="text-xs text-vintage-dust ml-2">({custSelected.customer_type})</span>
                </p>
                <p className="text-xs text-vintage-dust flex items-center gap-1"><Mail className="w-3 h-3" /> {custSelected.email}</p>
              </div>
              <button onClick={() => setCustSelected(null)}
                      className="text-xs text-vintage-burgundy hover:underline">Изменить</button>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                label="Поиск (e-mail, имя, компания)"
                value={custQ}
                onChange={(e) => searchCust(e.target.value)}
                placeholder="Например, olga@..."
              />
              {custSearchPending && <p className="text-xs text-vintage-dust flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Поиск...</p>}
              {custResults.length > 0 && (
                <div className="border border-vintage-sand max-h-56 overflow-y-auto"
                     style={{ borderRadius: "var(--radius-vintage)" }}>
                  {custResults.map(c => (
                    <button key={c.id} onClick={() => { setCustSelected(c); setCustResults([]); setCustQ(""); }}
                            className="w-full p-2 text-left hover:bg-vintage-parchment border-b border-vintage-sand/40 last:border-0">
                      <p className="text-sm text-vintage-ink">
                        {[c.vorname, c.nachname].filter(Boolean).join(" ") || "Без имени"}
                        <span className="text-xs text-vintage-dust ml-2">({c.customer_type})</span>
                      </p>
                      <p className="text-xs text-vintage-dust">{c.email}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="E-mail *"  type="email" value={newEmail} onChange={(e)=>setNewEmail(e.target.value)}
                   placeholder="client@example.com" required />
            <Input label="Имя"      value={newName} onChange={(e)=>setNewName(e.target.value)}
                   placeholder="Имя Фамилия" />
          </div>
        )}
      </section>

      {/* ─── Items ────────────────────────────────────────────────── */}
      <section className="bg-vintage-white border border-vintage-sand p-6 space-y-4"
               style={{ borderRadius: "var(--radius-card)" }}>
        <div className="flex items-baseline justify-between border-b border-vintage-sand/50 pb-3">
          <h2 className="font-serif text-lg text-vintage-espresso flex items-center gap-2">
            <Package className="w-4 h-4 text-vintage-gold" /> Товары
          </h2>
          <p className="text-xs text-vintage-dust">Позиций: {items.length}</p>
        </div>

        {/* Items-Liste */}
        {items.length > 0 && (
          <div className="divide-y divide-vintage-sand/40">
            {items.map(i => (
              <div key={i.id} className="flex items-center gap-3 py-2">
                <div className="w-10 h-10 bg-vintage-parchment overflow-hidden flex-shrink-0"
                     style={{ borderRadius: "var(--radius-vintage)" }}>
                  {i.hauptbild_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={i.hauptbild_url} alt="" className="w-full h-full object-cover" />
                  ) : <Package className="w-4 h-4 text-vintage-sand m-auto mt-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-vintage-ink truncate">{i.name}</p>
                  <p className="text-xs text-vintage-dust">{formatPreis(i.preis)} · На складе: {i.lagerbestand}</p>
                </div>
                <input type="number" min={1} max={i.lagerbestand} value={i.menge}
                       onChange={(e) => updateMenge(i.id, parseInt(e.target.value) || 1)}
                       className="w-16 px-2 py-1 bg-vintage-cream border border-vintage-sand text-sm text-center"
                       style={{ borderRadius: "var(--radius-vintage)" }} />
                <p className="font-serif text-sm text-vintage-espresso w-24 text-right">
                  {formatPreis(i.preis * i.menge)}
                </p>
                <button onClick={() => removeItem(i.id)}
                        className="p-1 text-vintage-dust hover:text-vintage-burgundy">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Produkt-Suche */}
        <div className="border-t border-vintage-sand/30 pt-3 space-y-2">
          <Input
            label="Добавить товар"
            value={prodQ}
            onChange={(e) => searchProd(e.target.value)}
            placeholder="Название, slug или артикул ..."
          />
          {prodSearchPending && <p className="text-xs text-vintage-dust flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Поиск...</p>}
          {prodResults.length > 0 && (
            <div className="border border-vintage-sand max-h-64 overflow-y-auto"
                 style={{ borderRadius: "var(--radius-vintage)" }}>
              {prodResults.map(p => (
                <button key={p.id}
                        onClick={() => addItem(p)}
                        disabled={!!items.find(i => i.id === p.id)}
                        className="w-full flex items-center gap-3 p-2 text-left hover:bg-vintage-parchment border-b border-vintage-sand/40 last:border-0 disabled:opacity-40 disabled:cursor-not-allowed">
                  <div className="w-10 h-10 bg-vintage-parchment overflow-hidden flex-shrink-0"
                       style={{ borderRadius: "var(--radius-vintage)" }}>
                    {p.hauptbild_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={p.hauptbild_url} alt="" className="w-full h-full object-cover" />
                    ) : <Package className="w-4 h-4 text-vintage-sand m-auto mt-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-vintage-ink truncate">{p.name}</p>
                    <p className="text-xs text-vintage-dust">
                      {p.artikel_code && `${p.artikel_code} · `}На складе: {p.lagerbestand}
                    </p>
                  </div>
                  <p className="font-serif text-sm text-vintage-espresso">{formatPreis(p.preis)}</p>
                  <Plus className="w-4 h-4 text-vintage-gold" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Total */}
        {items.length > 0 && (
          <div className="border-t border-vintage-sand pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-vintage-dust">
              <span>Нетто (без НДС)</span><span>{formatPreis(totalNetto)}</span>
            </div>
            <div className="flex justify-between text-vintage-dust">
              <span>НДС 12 %</span><span>{formatPreis(totalTax)}</span>
            </div>
            <div className="flex justify-between font-serif text-lg text-vintage-espresso pt-1 border-t border-vintage-sand/40">
              <span>Итого брутто</span><span>{formatPreis(totalBrutto)}</span>
            </div>
          </div>
        )}
      </section>

      {/* ─── Versand + Adresse ─────────────────────────────────────── */}
      <section className="bg-vintage-white border border-vintage-sand p-6 space-y-4"
               style={{ borderRadius: "var(--radius-card)" }}>
        <h2 className="font-serif text-lg text-vintage-espresso border-b border-vintage-sand/50 pb-3">
          Доставка
        </h2>

        <Select label="Способ доставки" value={versandart}
                onChange={(e) => setVersandart((e.target as HTMLSelectElement).value)}
                options={[
                  { value: "abholung", label: "Самовывоз, Алматы" },
                  { value: "standard", label: "Стандартная доставка (KZ)" },
                  { value: "express",  label: "Экспресс" },
                  { value: "international", label: "Международная доставка" },
                ]} />

        {versandart !== "abholung" && (
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_80px] gap-3">
            <Input label="Улица и дом" value={strasse} onChange={(e) => setStrasse(e.target.value)} />
            <Input label="Индекс"      value={plz}     onChange={(e) => setPlz(e.target.value)} />
            <Input label="Город"       value={ort}     onChange={(e) => setOrt(e.target.value)} />
            <Input label="Страна"      value={land}    onChange={(e) => setLand(e.target.value)} maxLength={2} />
          </div>
        )}
      </section>

      {/* ─── Notiz + Status ─────────────────────────────────────── */}
      <section className="bg-vintage-white border border-vintage-sand p-6 space-y-4"
               style={{ borderRadius: "var(--radius-card)" }}>
        <h2 className="font-serif text-lg text-vintage-espresso border-b border-vintage-sand/50 pb-3">
          Заметка и статус
        </h2>
        <Textarea label="Заметка клиента / внутренняя заметка" rows={3}
                  value={notiz} onChange={(e) => setNotiz(e.target.value)}
                  placeholder="Например: особое пожелание, заказ по телефону, дата доставки ..." />
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)}
                 className="w-4 h-4 accent-vintage-sage" />
          <span className="text-sm text-vintage-ink font-sans">
            <strong>Уже оплачен</strong> — сразу отметить заказ как оплаченный (например, наличными при самовывозе)
          </span>
        </label>
      </section>

      {/* ─── Submit ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 sticky bottom-4 bg-vintage-parchment border border-vintage-sand p-4"
           style={{ borderRadius: "var(--radius-card)" }}>
        <p className="text-sm text-vintage-dust">
          {items.length > 0 ? (
            <>Итого: <strong className="font-serif text-vintage-espresso">{formatPreis(totalBrutto)}</strong> · позиций: {items.length}</>
          ) : (
            <>Товары ещё не выбраны</>
          )}
        </p>
        <Button onClick={submit} loading={submitPending}
                disabled={items.length === 0 || (custMode === "new" && !newEmail) || (custMode === "search" && !custSelected)}
                icon={<Save className="w-3.5 h-3.5" />} size="lg">
          {paid ? "Создать заказ + оплачен" : "Создать заказ (ожидает)"}
        </Button>
      </div>
    </div>
  );
}
