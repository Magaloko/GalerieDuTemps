"use client";

import { useState, useActionState, useTransition } from "react";
import { CheckCircle2, AlertCircle, Send, RefreshCw, Unlink, Loader2 } from "lucide-react";
import { Input }  from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  telegramVerbindenAction, telegramTrennenAction, telegramWebhookCheckAction,
  type ActionResult,
} from "./actions";

interface Props {
  verbunden:  boolean;
  username:   string | null;
  webhookUrl: string | null;
}

export function TelegramSetupClient({ verbunden, username, webhookUrl }: Props) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    telegramVerbindenAction, null
  );
  const [actionPending, startAction] = useTransition();
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const runCheck = () => {
    setActionMsg(null); setActionErr(null);
    startAction(async () => {
      const r = await telegramWebhookCheckAction();
      if (r.ok) setActionMsg(r.message ?? "OK");
      else setActionErr(r.error);
    });
  };

  const runTrennen = () => {
    if (!confirm("Bot trennen? Webhook wird entfernt, bestehende Leads bleiben.")) return;
    setActionMsg(null); setActionErr(null);
    startAction(async () => {
      const r = await telegramTrennenAction();
      if (r.ok) setActionMsg(r.message ?? "Getrennt");
      else setActionErr(r.error);
    });
  };

  return (
    <div className="space-y-4">
      {/* Verbindungs-Status */}
      {verbunden ? (
        <section className="bg-vintage-sage/10 border border-vintage-sage/30 p-5 space-y-3"
                 style={{ borderRadius: "var(--radius-card)" }}>
          <div className="flex items-center gap-2 text-vintage-forest font-sans">
            <CheckCircle2 className="w-5 h-5" />
            <strong>Bot verbunden</strong>
            {username && <span className="text-vintage-dust">· @{username}</span>}
          </div>
          {webhookUrl && (
            <div className="text-xs font-mono text-vintage-dust bg-vintage-white p-2 break-all"
                 style={{ borderRadius: "var(--radius-vintage)" }}>
              Webhook: {webhookUrl}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={runCheck} loading={actionPending}
                    icon={<RefreshCw className="w-3.5 h-3.5" />}>
              Webhook-Status prüfen
            </Button>
            <Button size="sm" variant="danger" onClick={runTrennen}
                    icon={<Unlink className="w-3.5 h-3.5" />}>
              Bot trennen
            </Button>
          </div>
        </section>
      ) : (
        <section className="bg-vintage-white border border-vintage-sand p-5 space-y-4"
                 style={{ borderRadius: "var(--radius-card)" }}>
          <h3 className="font-serif text-base text-vintage-espresso">Bot verbinden</h3>
          <form action={action} className="space-y-3">
            <Input
              label="Bot Token (von BotFather)"
              name="token"
              type="password"
              required
              placeholder="123456789:ABCdefGhIjKlMnOpQrStUvWxYz1234567890"
              hint="Wird sicher gespeichert. Nur als Server-Geheimnis verwendet."
            />
            <Button type="submit" loading={pending} icon={<Send className="w-3.5 h-3.5" />}>
              Verbinden + Webhook setzen
            </Button>
          </form>
        </section>
      )}

      {/* Feedback */}
      {(state?.ok === true || actionMsg) && (
        <div className="flex items-start gap-2 px-4 py-3 bg-vintage-sage/10 border border-vintage-sage/30 text-sm text-vintage-forest whitespace-pre-line"
             style={{ borderRadius: "var(--radius-card)" }}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{actionMsg ?? (state?.ok ? state.message : "") ?? ""}</span>
        </div>
      )}
      {(state?.ok === false || actionErr) && (
        <div className="flex items-start gap-2 px-4 py-3 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-sm text-vintage-burgundy"
             style={{ borderRadius: "var(--radius-card)" }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{actionErr ?? (state?.ok === false ? state.error : "")}</span>
        </div>
      )}

      {actionPending && (
        <div className="flex items-center gap-2 text-xs text-vintage-dust">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> arbeite …
        </div>
      )}
    </div>
  );
}
