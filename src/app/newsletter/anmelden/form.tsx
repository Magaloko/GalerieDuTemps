"use client";

import { useState } from "react";
import { Sparkles, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function NewsletterAnmeldenForm() {
  const [email,   setEmail]   = useState("");
  const [vorname, setVorname] = useState("");
  const [status,  setStatus]  = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg,     setMsg]     = useState("");

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const r = await fetch("/api/newsletter/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, vorname, quelle: "anmelden-seite" }),
      });
      const data = await r.json();
      if (data.ok) setStatus("ok");
      else { setMsg(data.error ?? "Fehler"); setStatus("error"); }
    } catch {
      setMsg("Verbindungs-Fehler"); setStatus("error");
    }
  };

  return (
    <div className="max-w-md w-full">
      <div className="text-center mb-8">
        <Sparkles className="w-6 h-6 text-vintage-gold mx-auto mb-2" />
        <h1 className="font-serif text-3xl text-vintage-cream">Vintage Newsletter</h1>
        <p className="text-vintage-dust font-sans text-sm mt-2">
          Новые поступления, эксклюзивные купоны, истории винтажа.
        </p>
      </div>

      {status === "ok" ? (
        <div className="bg-vintage-brown border border-vintage-sand/40 p-8 text-center" style={{ borderRadius: "var(--radius-card)" }}>
          <CheckCircle2 className="w-12 h-12 text-vintage-sage mx-auto mb-3" />
          <p className="font-serif text-xl text-vintage-cream mb-2">Почти готово!</p>
          <p className="text-vintage-dust text-sm font-sans flex items-center justify-center gap-2">
            <Mail className="w-4 h-4" /> Подтвердите ваш e-mail в почте.
          </p>
        </div>
      ) : (
        <form onSubmit={handle} className="bg-vintage-brown border border-vintage-sand/40 p-6 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
          <Input label="Имя (необязательно)" value={vorname} onChange={(e) => setVorname(e.target.value)} placeholder="Анна" />
          <Input label="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="anna@example.kz" />

          {status === "error" && (
            <div className="flex items-center gap-2 p-3 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy text-sm font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
              <AlertCircle className="w-4 h-4" /> {msg}
            </div>
          )}

          <Button type="submit" loading={status === "loading"} className="w-full justify-center">
            Подписаться
          </Button>
          <p className="text-xs text-vintage-dust font-sans text-center">
            Нажимая «Подписаться», вы соглашаетесь с нашей политикой конфиденциальности.
            Отписаться можно в один клик.
          </p>
        </form>
      )}
    </div>
  );
}
