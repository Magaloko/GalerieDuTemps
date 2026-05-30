"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Save, Trash2, Plug, CheckCircle2, AlertCircle, Eye, EyeOff, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { kiKeySpeichernAction, kiKeyLoeschenAction, kiKeyTestenAction } from "./actions";
import type { KiKeyStatus } from "@/lib/db/ki-einstellungen";

const QUELLE_LABEL: Record<KiKeyStatus["quelle"], string> = {
  db:    "сохранён в админке",
  env:   "из переменной окружения (ENV)",
  keine: "не задан",
};

export function KiEinstellungenFormular({ status }: { status: KiKeyStatus }) {
  const router = useRouter();
  const [key, setKey]   = useState("");
  const [show, setShow] = useState(false);
  const [savePending, startSave] = useTransition();
  const [delPending,  startDel]  = useTransition();
  const [testPending, startTest] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const save = () => {
    setMsg(null);
    startSave(async () => {
      const r = await kiKeySpeichernAction(key);
      if (!r.ok) { setMsg({ type: "err", text: r.error ?? "Ошибка" }); return; }
      setKey("");
      setMsg({ type: "ok", text: "Ключ сохранён. ИИ-функции теперь используют его." });
      router.refresh();
    });
  };

  const loeschen = () => {
    if (!confirm("Удалить сохранённый ключ? ИИ откатится на ENV (если задан).")) return;
    setMsg(null);
    startDel(async () => {
      const r = await kiKeyLoeschenAction();
      if (!r.ok) { setMsg({ type: "err", text: r.error ?? "Ошибка" }); return; }
      setMsg({ type: "ok", text: "Ключ удалён." });
      router.refresh();
    });
  };

  const testen = () => {
    setMsg(null);
    startTest(async () => {
      const r = await kiKeyTestenAction();
      setMsg({ type: r.ok ? "ok" : "err", text: r.message });
    });
  };

  return (
    <div className="space-y-5">
      {/* Status */}
      <div
        className="flex items-start gap-3 p-4"
        style={{
          background:   status.gesetzt ? "rgba(127,140,90,0.10)" : "rgba(232,112,58,0.08)",
          border:       `1px solid ${status.gesetzt ? "rgba(127,140,90,0.35)" : "rgba(232,112,58,0.40)"}`,
          borderLeft:   `4px solid ${status.gesetzt ? "var(--color-sage, #7F8C5A)" : "var(--color-coral)"}`,
          borderRadius: "var(--radius-card)",
        }}
      >
        {status.gesetzt
          ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#52663F" }} />
          : <AlertCircle  className="w-4 h-4 mt-0.5 shrink-0 text-vintage-burgundy" />}
        <div className="text-sm font-sans">
          {status.gesetzt ? (
            <p className="text-vintage-ink">
              Ключ задан · <span className="text-vintage-dust">{QUELLE_LABEL[status.quelle]}</span>
              {status.maskiert && (
                <span className="ml-2 font-mono text-xs text-vintage-dust">{status.maskiert}</span>
              )}
            </p>
          ) : (
            <p className="text-vintage-burgundy">
              Ключ не задан — ассистент и ИИ-заполнение товаров не работают, пока не введёте ключ.
            </p>
          )}
        </div>
      </div>

      {/* Eingabe */}
      <section
        className="bg-vintage-white border border-vintage-sand p-6 space-y-4"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <div>
          <label className="block text-xs font-sans uppercase tracking-widest text-vintage-brown mb-2">
            DeepSeek API-ключ
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={show ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={status.gesetzt ? "Введите новый ключ для замены…" : "sk-…"}
                autoComplete="off"
                spellCheck={false}
                className="w-full px-3 py-2.5 pr-10 text-sm font-mono bg-vintage-parchment border border-vintage-sand text-vintage-ink"
                style={{ borderRadius: "var(--radius-vintage)" }}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-vintage-dust hover:text-vintage-brown"
                aria-label={show ? "Скрыть" : "Показать"}
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button onClick={save} loading={savePending} disabled={key.trim().length < 10} icon={<Save className="w-3.5 h-3.5" />}>
              Сохранить
            </Button>
          </div>
          <p className="text-[11px] text-vintage-dust font-sans mt-2">
            Получить ключ: <span className="font-mono">platform.deepseek.com</span> → API Keys. Сохраняется в базе (не в коде).
          </p>
        </div>

        <div className="flex items-center gap-3 pt-1 border-t border-vintage-sand/40">
          <button
            type="button"
            onClick={testen}
            disabled={testPending || !status.gesetzt}
            className="inline-flex items-center gap-1.5 text-xs font-sans uppercase tracking-widest px-3 py-2 border border-vintage-sand text-vintage-brown hover:bg-vintage-parchment disabled:opacity-40 transition-colors mt-3"
            style={{ borderRadius: "var(--radius-vintage)" }}
          >
            {testPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plug className="w-3.5 h-3.5" />}
            Проверить соединение
          </button>
          {status.quelle === "db" && (
            <button
              type="button"
              onClick={loeschen}
              disabled={delPending}
              className="inline-flex items-center gap-1.5 text-xs font-sans uppercase tracking-widest px-3 py-2 text-vintage-burgundy hover:bg-vintage-burgundy/10 disabled:opacity-40 transition-colors mt-3"
              style={{ borderRadius: "var(--radius-vintage)" }}
            >
              {delPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Удалить
            </button>
          )}
        </div>
      </section>

      {/* Meldung */}
      {msg && (
        <div
          className="flex items-start gap-2.5 px-4 py-3 text-sm font-sans"
          style={{
            background:   msg.type === "ok" ? "rgba(127,140,90,0.12)" : "rgba(178,34,52,0.08)",
            border:       `1px solid ${msg.type === "ok" ? "rgba(127,140,90,0.45)" : "rgba(178,34,52,0.30)"}`,
            borderRadius: "var(--radius-card)",
            color:        msg.type === "ok" ? "#52663F" : "var(--color-burgundy, #8B1E2D)",
          }}
        >
          {msg.type === "ok"
            ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            : <AlertCircle  className="w-4 h-4 mt-0.5 shrink-0" />}
          <span className="break-words">{msg.text}</span>
        </div>
      )}

      <p className="text-[11px] text-vintage-dust font-sans leading-relaxed">
        Этот ключ используют: чат-ассистент на сайте и «Заполнить с ИИ» при добавлении/редактировании
        товаров. Если ключ был где-то показан открыто — сгенерируйте новый на platform.deepseek.com.
      </p>
    </div>
  );
}
