"use client";

import { useState, useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, UserPlus, KeyRound, Shield, Loader2, AlertCircle } from "lucide-react";
import { Input }   from "@/components/ui/input";
import { Select }  from "@/components/ui/select";
import { Button }  from "@/components/ui/button";
import {
  benutzerAnlegenAction, benutzerStatusAction,
  benutzerPasswortResetAction, benutzerRolleAction,
  type ActionResult,
} from "./actions";
import type { Benutzer, BenutzerRolle } from "@/lib/db/benutzer";

interface Props { users: Benutzer[]; currentUserId: string }

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let p = "";
  for (let i = 0; i < 14; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

export function BenutzerVerwaltungClient({ users, currentUserId }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [tempPw, setTempPw] = useState(() => generatePassword());
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(benutzerAnlegenAction, null);
  const [actionPending, startAction] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = () => router.refresh();

  const callAction = (fn: () => Promise<ActionResult>) => {
    setActionError(null);
    startAction(async () => {
      const r = await fn();
      if (!r.ok) setActionError(r.error);
      else refresh();
    });
  };

  return (
    <div className="space-y-6">

      {/* New User Form (toggleable) */}
      <section className="bg-vintage-white border border-vintage-sand p-6 space-y-4"
               style={{ borderRadius: "var(--radius-card)" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-vintage-espresso">Neuer Admin</h2>
          <Button size="sm" variant={showForm ? "ghost" : "primary"} onClick={() => setShowForm(!showForm)}
                  icon={<UserPlus className="w-3.5 h-3.5" />}>
            {showForm ? "Abbrechen" : "Hinzufügen"}
          </Button>
        </div>

        {state?.ok === true && state.message && (
          <div className="flex items-center gap-2 px-4 py-3 bg-vintage-sage/10 border border-vintage-sage/30 text-sm text-vintage-forest"
               style={{ borderRadius: "var(--radius-card)" }}>
            <CheckCircle2 className="w-4 h-4" /> {state.message}
          </div>
        )}
        {state?.ok === false && (
          <div className="flex items-center gap-2 px-4 py-3 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-sm text-vintage-burgundy"
               style={{ borderRadius: "var(--radius-card)" }}>
            <AlertCircle className="w-4 h-4" /> {state.error}
          </div>
        )}

        {showForm && (
          <form action={action} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Name" name="name" required placeholder="Max Mustermann" />
              <Input label="E-Mail" name="email" type="email" required placeholder="admin@galeriedutemps.kz" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_120px] gap-4">
              <Input label="Temporäres Passwort" name="passwort" required
                     defaultValue={tempPw}
                     hint="User muss es nach Login ändern. Per Mail versendet." />
              <div className="flex items-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => setTempPw(generatePassword())}>
                  Neu generieren
                </Button>
              </div>
              <Select label="Rolle" name="rolle" defaultValue="admin"
                      options={[
                        { value: "admin",      label: "Admin"      },
                        { value: "superadmin", label: "Superadmin" },
                      ]} />
            </div>
            <Button type="submit" loading={pending} icon={<UserPlus className="w-3.5 h-3.5" />}>
              Anlegen + Mail senden
            </Button>
          </form>
        )}
      </section>

      {/* Action-Feedback (für inline-Aktionen unten) */}
      {actionError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-sm text-vintage-burgundy"
             style={{ borderRadius: "var(--radius-card)" }}>
          <AlertCircle className="w-4 h-4" /> {actionError}
        </div>
      )}

      {/* User List */}
      <div className="bg-vintage-white border border-vintage-sand overflow-hidden"
           style={{ borderRadius: "var(--radius-card)" }}>
        <table className="w-full text-sm font-sans">
          <thead>
            <tr className="border-b border-vintage-sand bg-vintage-parchment/50 text-xs uppercase tracking-widest text-vintage-dust">
              <th className="text-left px-4 py-3 font-normal">Name</th>
              <th className="text-left px-4 py-3 font-normal">E-Mail</th>
              <th className="text-left px-4 py-3 font-normal w-32">Rolle</th>
              <th className="text-center px-4 py-3 font-normal w-24">Status</th>
              <th className="text-right px-4 py-3 font-normal">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-vintage-sand/40">
            {users.map(u => (
              <tr key={u.id} className={`hover:bg-vintage-parchment/30 transition-colors ${!u.aktiv ? "opacity-60" : ""}`}>
                <td className="px-4 py-3 text-vintage-ink">
                  {u.name ?? "—"}
                  {u.id === currentUserId && (
                    <span className="ml-2 text-xs text-vintage-gold">(вы)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-vintage-dust">{u.email}</td>
                <td className="px-4 py-3">
                  {u.id === currentUserId ? (
                    <span className="text-xs uppercase tracking-widest text-vintage-brown">{u.rolle}</span>
                  ) : (
                    <select defaultValue={u.rolle}
                            onChange={(e) => callAction(() => benutzerRolleAction(u.id, e.target.value as BenutzerRolle))}
                            className="text-xs bg-vintage-cream border border-vintage-sand px-2 py-1"
                            style={{ borderRadius: "var(--radius-vintage)" }}>
                      <option value="admin">Admin</option>
                      <option value="superadmin">Superadmin</option>
                    </select>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {u.aktiv ? (
                    <span className="inline-flex items-center gap-1 text-vintage-sage text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Aktiv
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-vintage-dust text-xs">
                      <XCircle className="w-3.5 h-3.5" /> Deaktiviert
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => {
                        const pw = prompt(`Neues Passwort für ${u.email} (min. 10 Zeichen):`, generatePassword());
                        if (pw && pw.length >= 10) {
                          callAction(() => benutzerPasswortResetAction(u.id, pw));
                        }
                      }}
                      disabled={actionPending}
                      title="Passwort zurücksetzen"
                      className="p-2 text-vintage-dust hover:text-vintage-brown hover:bg-vintage-parchment transition-colors"
                      style={{ borderRadius: "var(--radius-vintage)" }}>
                      <KeyRound className="w-4 h-4" />
                    </button>
                    {u.id !== currentUserId && (
                      <button
                        onClick={() => callAction(() => benutzerStatusAction(u.id, !u.aktiv))}
                        disabled={actionPending}
                        title={u.aktiv ? "Deaktivieren" : "Aktivieren"}
                        className="p-2 text-vintage-dust hover:text-vintage-brown hover:bg-vintage-parchment transition-colors"
                        style={{ borderRadius: "var(--radius-vintage)" }}>
                        {actionPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
