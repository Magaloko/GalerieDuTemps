import { notFound } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { orderById } from "@/lib/db/orders";
import { rechnungZuOrder } from "@/lib/db/invoices";
import { systemEinstellungenLaden } from "@/lib/db/system-einstellungen";
import { formatPreis } from "@/lib/utils/preis";
import { PrintButton } from "./print-button";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Счёт-фактура" };
export const dynamic = "force-dynamic";

/**
 * Счёт-фактура (Счёт на оплату) — Format für Kasachstan.
 *
 * Unterschiede zum DE-Format:
 *  - Währung: KZT (₸)
 *  - Steuer-IDs: ИИН (физлицо/ИП) / БИН (ТОО) statt USt-IdNr.
 *  - Bankdaten des Ausstellers: ИИК / БИК / БИН (statt IBAN/BIC)
 *  - НДС (НДС-ҚҚС) — Standard 12% in KZ
 *  - Zahlungshinweis: Kaspi.kz Pay als primäre Methode + IIC-Überweisung
 *  - Kein EPC-QR (EU-only) — stattdessen Kaspi-QR (sofern verfügbar)
 *  - Pflichtklausel-Texte auf Russisch
 */
export default async function RechnungsSeite({
  params,
}: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/kunde/anmelden");

  const { id } = await params;
  const [order, sys] = await Promise.all([
    orderById(id),
    systemEinstellungenLaden(),
  ]);
  if (!order) notFound();

  // Auth-Check
  const role = session.user.role;
  const istAdmin = role === "admin" || role === "superadmin";
  if (!istAdmin && order.customer_id !== session.user.id) notFound();

  // Invoice erstellen/laden
  const invoice = await rechnungZuOrder(id);

  // Steuersätze aufschlüsseln
  const taxByRate = new Map<number, { netto: number; tax: number; brutto: number }>();
  for (const item of order.items ?? []) {
    const entry = taxByRate.get(item.tax_rate) ?? { netto: 0, tax: 0, brutto: 0 };
    entry.brutto += item.zeile_total_cents;
    entry.tax    += item.tax_amount_cents;
    entry.netto   = entry.brutto - entry.tax;
    taxByRate.set(item.tax_rate, entry);
  }

  const belegNr = invoice
    ? `СФ-${invoice.invoice_number.toString().padStart(4, "0")}`
    : `ПРЕД-GDT-${order.order_number}`;
  const adresse = order.billing_address;
  const waehrung = order.waehrung as "KZT" | "EUR" | "USD" | "RUB" | undefined;

  // Kaspi-QR (sofern vom Webhook befüllt)
  const kaspiQrUrl = order.kaspi_qr_url ?? null;
  const istBezahlt = ["paid", "fulfilled", "completed"].includes(order.status);

  return (
    <div className="min-h-screen bg-white print:bg-white" lang="ru">
      {/* Print-Bar */}
      <div className="print:hidden p-4 bg-vintage-parchment border-b border-vintage-sand flex items-center justify-between">
        <p className="text-sm font-sans text-vintage-brown">Счёт-фактура #{belegNr}</p>
        <PrintButton />
      </div>

      <div className="max-w-3xl mx-auto p-8 sm:p-12 font-sans text-black">
        {/* Kopfzeile */}
        <div className="flex justify-between items-start mb-12 border-b-2 border-black pb-6">
          <div>
            <p className="text-vintage-gold text-2xl tracking-widest mb-1">✦</p>
            <h1 className="font-serif text-3xl text-black">{sys.firma_name}</h1>
            <p className="text-sm text-black/70 mt-2">
              {sys.firma_strasse}<br/>
              {sys.firma_plz} {sys.firma_ort}<br/>
              {sys.firma_land}<br/>
              {sys.firma_email && <>{sys.firma_email}<br/></>}
              {/* Steuerliche ID (БИН) des Ausstellers */}
              {sys.firma_steuer_id && <>БИН: {sys.firma_steuer_id}</>}
            </p>
          </div>
          <div className="text-right">
            <h2 className="font-serif text-2xl text-black mb-1">Счёт-фактура</h2>
            <p className="text-sm text-black/70">
              Номер счёта: <strong>{belegNr}</strong>
            </p>
            <p className="text-sm text-black/70">
              Номер заказа: <strong>GDT-{order.order_number}</strong>
            </p>
            <p className="text-sm text-black/70">
              Дата: <strong>{new Date(invoice?.rechnungs_datum ?? order.erstellt_am).toLocaleDateString("ru-RU")}</strong>
            </p>
          </div>
        </div>

        {/* Empfänger */}
        <div className="mb-10">
          <p className="text-xs uppercase tracking-widest text-black/50 mb-2">
            Получатель
          </p>
          <p className="text-base text-black font-serif">{order.customer_name ?? order.customer_email}</p>
          {adresse.firma && <p className="text-sm text-black">{adresse.firma}</p>}
          {adresse.strasse && <p className="text-sm text-black/70">{adresse.strasse}</p>}
          {(adresse.plz || adresse.ort) && <p className="text-sm text-black/70">{adresse.plz} {adresse.ort}</p>}
          {adresse.land && <p className="text-sm text-black/70">{adresse.land}</p>}
          {/* ИИН / БИН Snapshot vom Bestellzeitpunkt */}
          {order.iin_snapshot && <p className="text-sm text-black/70 mt-1">ИИН: {order.iin_snapshot}</p>}
          {order.bin_snapshot && <p className="text-sm text-black/70">БИН: {order.bin_snapshot}</p>}
        </div>

        {/* Positionen */}
        <table className="w-full mb-8 border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left  py-2 text-xs uppercase tracking-widest font-normal">№</th>
              <th className="text-left  py-2 text-xs uppercase tracking-widest font-normal">Наименование</th>
              <th className="text-center py-2 text-xs uppercase tracking-widest font-normal">Кол-во</th>
              <th className="text-right py-2 text-xs uppercase tracking-widest font-normal">Цена с НДС</th>
              <th className="text-right py-2 text-xs uppercase tracking-widest font-normal">НДС</th>
              <th className="text-right py-2 text-xs uppercase tracking-widest font-normal">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {(order.items ?? []).map((item, i) => (
              <tr key={item.id} className="border-b border-black/20">
                <td className="py-2 text-black/70">{i + 1}</td>
                <td className="py-2 text-black">{item.produkt_name}</td>
                <td className="py-2 text-center text-black/70">{item.menge}</td>
                <td className="py-2 text-right text-black/70">{formatPreis(item.einzelpreis_cents / 100, waehrung)}</td>
                <td className="py-2 text-right text-black/70">{item.tax_rate}%</td>
                <td className="py-2 text-right text-black font-serif">{formatPreis(item.zeile_total_cents / 100, waehrung)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {order.rabatt_cents > 0 && (
              <tr>
                <td colSpan={5} className="py-2 text-right">
                  Скидка {order.coupon_code_snapshot && `(${order.coupon_code_snapshot})`}
                </td>
                <td className="py-2 text-right text-vintage-sage">− {formatPreis(order.rabatt_cents / 100, waehrung)}</td>
              </tr>
            )}
            {Array.from(taxByRate.entries()).map(([rate, sums]) => (
              <tr key={rate} className="text-xs text-black/60">
                <td colSpan={4} className="py-1 text-right">
                  НДС {rate}% (от {formatPreis(sums.netto / 100, waehrung)})
                </td>
                <td className="py-1 text-right">{rate}%</td>
                <td className="py-1 text-right">{formatPreis(sums.tax / 100, waehrung)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-black">
              <td colSpan={5} className="py-3 text-right font-serif text-base">
                Итого к оплате
              </td>
              <td className="py-3 text-right font-serif text-xl">{formatPreis(order.total_cents / 100, waehrung)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Pflichtklauseln */}
        <div className="mb-8 p-4 border border-black/20 bg-black/5 text-xs text-black leading-relaxed space-y-2">
          {invoice?.kleinunternehmer && (
            <p>
              <strong>Специальный налоговый режим:</strong> Поставщик применяет упрощённый
              налоговый режим в соответствии с Налоговым кодексом РК. НДС не выделяется.
            </p>
          )}
        </div>

        {/* Zahlungsinfo + QR */}
        <div className="grid grid-cols-2 gap-6 mb-12">
          <div>
            <p className="text-xs uppercase tracking-widest text-black/50 mb-2">
              Способ оплаты
            </p>
            {istBezahlt ? (
              <p className="text-vintage-sage font-serif">
                ✓ Оплачено {order.bezahlt_am && new Date(order.bezahlt_am).toLocaleDateString("ru-RU")}
              </p>
            ) : order.status === "cancelled" ? (
              <p className="text-vintage-burgundy">Заказ отменён</p>
            ) : (
              <>
                <p className="text-sm text-black mb-2"><strong>Kaspi.kz Pay</strong> или банковский перевод</p>
                {/* IIC/BIK des Verkäufers — wenn als Settings hinterlegt */}
                {/* Wir nutzen sepa_absender_iban als generisches "Kontonummer"-Feld */}
                {sys.sepa_absender_iban && (
                  <div className="mt-2 text-xs text-black/70 space-y-0.5">
                    <p><strong>{sys.sepa_absender_name || sys.firma_name}</strong></p>
                    <p>ИИК: {sys.sepa_absender_iban}</p>
                    {sys.sepa_absender_bic && <p>БИК: {sys.sepa_absender_bic}</p>}
                    {sys.firma_steuer_id && <p>БИН: {sys.firma_steuer_id}</p>}
                    <p>Назначение платежа: <strong>GDT-{order.order_number}</strong></p>
                  </div>
                )}
              </>
            )}
          </div>
          {/* Kaspi-QR (falls vom Webhook befüllt) */}
          {kaspiQrUrl && !istBezahlt && (
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-black/50 mb-2">Kaspi QR</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={kaspiQrUrl} alt="Kaspi QR" className="inline-block w-32 h-32 border border-black/20" />
              <p className="text-xs text-black/50 mt-1">Сканируйте в Kaspi.kz</p>
            </div>
          )}
        </div>

        <div className="border-t border-black/20 pt-6 text-xs text-black/50 leading-relaxed">
          <p>{sys.firma_name} · {sys.firma_strasse} · {sys.firma_plz} {sys.firma_ort}</p>
          {sys.firma_handelsregister && <p>{sys.firma_handelsregister}</p>}
          <p>По вопросам: {sys.firma_email}</p>
        </div>
      </div>

      <style>{`@media print { @page { margin: 1.5cm; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }`}</style>
    </div>
  );
}
