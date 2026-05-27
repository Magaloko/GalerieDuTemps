"use client";

import { useState, useTransition } from "react";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select }   from "@/components/ui/select";
import { Button }   from "@/components/ui/button";
import { Save, Truck, FileText, XOctagon, CheckCircle2 } from "lucide-react";
import {
  statusAktualisierenAction,
  notizenAktualisierenAction,
  trackingAktualisierenAction,
  bestellungStornierenAction,
  type ActionResult,
} from "@/app/(admin)/admin/bestellungen/actions";

const STATUS_OPTIONS = [
  { value: "pending",   label: "Ожидает оплаты" },
  { value: "paid",      label: "Оплачен" },
  { value: "fulfilled", label: "Отправлен" },
  { value: "completed", label: "Завершён" },
  { value: "cancelled", label: "Отменён" },
  { value: "refunded",  label: "Возврат" },
];

interface Props {
  orderId:         string;
  initialStatus:   string;
  initialTracking: { nummer: string | null; url: string | null };
  initialNotizen:  { interne: string | null; kunden: string | null };
  storniert:       boolean;
}

function ResultBanner({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  if (result.ok) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-vintage-sage">
        <CheckCircle2 className="w-3.5 h-3.5" /> {result.message ?? "Готово"}
      </p>
    );
  }
  return <p className="text-xs text-vintage-burgundy">{result.error}</p>;
}

export function BestellungEditor({
  orderId,
  initialStatus,
  initialTracking,
  initialNotizen,
  storniert,
}: Props) {
  const [statusResult,   setStatusResult]   = useState<ActionResult | null>(null);
  const [trackingResult, setTrackingResult] = useState<ActionResult | null>(null);
  const [notizResult,    setNotizResult]    = useState<ActionResult | null>(null);
  const [stornoResult,   setStornoResult]   = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">

      {/* Status */}
      <section className="bg-vintage-white border border-vintage-sand p-5 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
        <h3 className="font-serif text-vintage-espresso flex items-center gap-2">
          <Save className="w-3.5 h-3.5 text-vintage-gold" /> Статус
        </h3>
        <form
          action={(fd) => startTransition(async () => setStatusResult(await statusAktualisierenAction(orderId, fd)))}
          className="space-y-3"
        >
          <Select name="status" defaultValue={initialStatus} options={STATUS_OPTIONS} />
          <div className="flex items-center justify-between">
            <Button type="submit" size="sm" loading={isPending} icon={<Save className="w-3 h-3" />}>
              Сохранить статус
            </Button>
            <ResultBanner result={statusResult} />
          </div>
        </form>
      </section>

      {/* Tracking */}
      <section className="bg-vintage-white border border-vintage-sand p-5 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
        <h3 className="font-serif text-vintage-espresso flex items-center gap-2">
          <Truck className="w-3.5 h-3.5 text-vintage-gold" /> Доставка
        </h3>
        <form
          action={(fd) => startTransition(async () => setTrackingResult(await trackingAktualisierenAction(orderId, fd)))}
          className="space-y-3"
        >
          <Input
            label="Трек-номер"
            name="tracking_nummer"
            defaultValue={initialTracking.nummer ?? ""}
            placeholder="DHL DE12345 / Kazpost / SDEK …"
          />
          <Input
            label="URL отслеживания"
            name="tracking_url"
            type="url"
            defaultValue={initialTracking.url ?? ""}
            placeholder="https://…"
            hint="Показывается клиенту в деталях заказа"
          />
          <div className="flex items-center justify-between">
            <Button type="submit" size="sm" loading={isPending} icon={<Save className="w-3 h-3" />}>
              Сохранить трекинг
            </Button>
            <ResultBanner result={trackingResult} />
          </div>
        </form>
      </section>

      {/* Notizen */}
      <section className="bg-vintage-white border border-vintage-sand p-5 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
        <h3 className="font-serif text-vintage-espresso flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-vintage-gold" /> Заметки
        </h3>
        <form
          action={(fd) => startTransition(async () => setNotizResult(await notizenAktualisierenAction(orderId, fd)))}
          className="space-y-3"
        >
          <Textarea
            label="Внутренняя заметка (не видна клиенту)"
            name="interne_notiz"
            defaultValue={initialNotizen.interne ?? ""}
            rows={3}
          />
          <Textarea
            label="Заметка для клиента (показывается в деталях заказа)"
            name="kunden_notiz"
            defaultValue={initialNotizen.kunden ?? ""}
            rows={3}
          />
          <div className="flex items-center justify-between">
            <Button type="submit" size="sm" loading={isPending} icon={<Save className="w-3 h-3" />}>
              Сохранить заметки
            </Button>
            <ResultBanner result={notizResult} />
          </div>
        </form>
      </section>

      {/* Storno */}
      {!storniert && (
        <section className="bg-vintage-burgundy/5 border border-vintage-burgundy/30 p-5 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
          <h3 className="font-serif text-vintage-burgundy flex items-center gap-2">
            <XOctagon className="w-3.5 h-3.5" /> Отмена заказа
          </h3>
          <p className="text-xs font-sans text-vintage-dust">
            Заказ будет переведён в статус <strong>cancelled</strong>, остаток вернётся на склад.
          </p>
          <Button
            type="button"
            variant="danger"
            size="sm"
            loading={isPending}
            onClick={() => {
              const grund = prompt("Укажите причину отмены (необязательно):") ?? "";
              if (!confirm("Вы действительно хотите отменить заказ? Остаток будет возвращён на склад.")) return;
              startTransition(async () => setStornoResult(await bestellungStornierenAction(orderId, grund)));
            }}
            icon={<XOctagon className="w-3 h-3" />}
          >
            Отменить заказ
          </Button>
          <ResultBanner result={stornoResult} />
        </section>
      )}
    </div>
  );
}
