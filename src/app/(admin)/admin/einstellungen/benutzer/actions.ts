"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import {
  benutzerErstellen, benutzerAktualisieren, benutzerLoeschen,
  type BenutzerRolle,
} from "@/lib/db/benutzer";
import { sendEmail } from "@/lib/email";

async function sendeBenutzerEinladung(email: string, name: string, passwort: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://galerie.apps.dadakaev.tech";
  await sendEmail({
    to:      [{ email, name }],
    subject: "Добро пожаловать в Admin · Galerie du Temps",
    htmlContent: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:32px;background:#FAF5E9;color:#1A120B">
        <h1 style="color:#C9A86A;font-size:28px;letter-spacing:0.1em">GALERIE du Temps</h1>
        <p>Привет, ${name}!</p>
        <p>Ваш аккаунт администратора готов. Пожалуйста, войдите и сразу смените пароль.</p>
        <p style="background:#fff;padding:16px;border-left:3px solid #C9A86A">
          <strong>Логин:</strong> ${email}<br>
          <strong>Временный пароль:</strong> <code>${passwort}</code>
        </p>
        <p><a href="${appUrl}/login" style="background:#1A120B;color:#FAF5E9;padding:12px 28px;text-decoration:none;letter-spacing:0.15em;text-transform:uppercase;font-size:12px">Войти в админ</a></p>
        <p style="font-size:12px;color:#7A6A55;margin-top:24px">
          Если письмо пришло по ошибке, проигнорируйте его.
        </p>
      </div>
    `,
  });
}

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

async function requireSuperadmin() {
  const session = await auth();
  if (!session?.user?.role) return null;
  if (session.user.role !== "superadmin") return null;
  return session;
}

export async function benutzerAnlegenAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireSuperadmin();
  if (!session) return { ok: false, error: "Только superadmin может управлять пользователями" };

  const email    = String(formData.get("email") ?? "").trim().toLowerCase();
  const name     = String(formData.get("name")  ?? "").trim();
  const rolle    = String(formData.get("rolle") ?? "admin") as BenutzerRolle;
  const passwort = String(formData.get("passwort") ?? "").trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "Некорректный e-mail" };
  if (!name || name.length < 2)
    return { ok: false, error: "Укажите имя" };
  if (!passwort || passwort.length < 10)
    return { ok: false, error: "Пароль должен содержать минимум 10 символов" };
  if (rolle !== "admin" && rolle !== "superadmin")
    return { ok: false, error: "Некорректная роль" };

  try {
    const neu = await benutzerErstellen({ email, name, passwort, rolle });
    // Einladungs-E-Mail mit temp Passwort versenden (best-effort)
    sendeBenutzerEinladung(email, name, passwort).catch(err =>
      console.error("[Benutzer-Mail]", err)
    );
    revalidatePath("/admin/einstellungen/benutzer");
    return { ok: true, message: `Пользователь "${neu.name}" создан. Письмо-приглашение отправлено.` };
  } catch (err: unknown) {
    if (err instanceof Error && /duplicate/i.test(err.message)) {
      return { ok: false, error: "E-mail уже используется" };
    }
    console.error("[benutzerAnlegen]", err);
    return { ok: false, error: "Не удалось создать пользователя" };
  }
}

export async function benutzerStatusAction(
  id: string,
  aktiv: boolean
): Promise<ActionResult> {
  const session = await requireSuperadmin();
  if (!session) return { ok: false, error: "Только superadmin" };
  if (session.user.id === id && !aktiv)
    return { ok: false, error: "Собственный аккаунт нельзя деактивировать" };
  await benutzerAktualisieren(id, { aktiv });
  revalidatePath("/admin/einstellungen/benutzer");
  return { ok: true };
}

export async function benutzerPasswortResetAction(
  id: string,
  neuesPasswort: string
): Promise<ActionResult> {
  const session = await requireSuperadmin();
  if (!session) return { ok: false, error: "Только superadmin" };
  if (!neuesPasswort || neuesPasswort.length < 10)
    return { ok: false, error: "Пароль: минимум 10 символов" };
  await benutzerAktualisieren(id, { passwort: neuesPasswort });
  return { ok: true, message: "Пароль сброшен" };
}

export async function benutzerRolleAction(
  id: string,
  rolle: BenutzerRolle
): Promise<ActionResult> {
  const session = await requireSuperadmin();
  if (!session) return { ok: false, error: "Только superadmin" };
  if (session.user.id === id && rolle !== "superadmin")
    return { ok: false, error: "Нельзя снять собственную роль superadmin" };
  await benutzerAktualisieren(id, { rolle });
  revalidatePath("/admin/einstellungen/benutzer");
  return { ok: true };
}

export async function benutzerDeaktivierenAction(id: string): Promise<ActionResult> {
  const session = await requireSuperadmin();
  if (!session) return { ok: false, error: "Только superadmin" };
  if (session.user.id === id)
    return { ok: false, error: "Собственный аккаунт нельзя удалить" };
  await benutzerLoeschen(id);
  revalidatePath("/admin/einstellungen/benutzer");
  return { ok: true, message: "Пользователь деактивирован" };
}
