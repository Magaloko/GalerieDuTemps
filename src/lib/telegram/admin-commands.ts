import { query } from "@/lib/db";
import { sendMessage } from "@/lib/telegram/client";
import { umsatzTrend } from "@/lib/db/dashboard-v2";
import { formatPreis } from "@/lib/utils/preis";
import { getSiteUrl } from "@/lib/site-url";

/* ──────────────────────────────────────────────────────────────────────────
 * Admin-Bot-Commands (Sprint B · 4.5 + 4.6)
 *
 * Nur für verknüpfte Admins. Returned true wenn ein Command erkannt + behandelt
 * wurde, sonst false (Caller macht dann normales Routing).
 *
 *   /sales [today|week|month]   — Umsatz-Report
 *   /edit <code> price=N stock=N [publish|hide]  — Schnell-Bearbeitung
 *   /draft                       — offene Entwürfe (aktiv=false) auflisten
 * ────────────────────────────────────────────────────────────────────────── */

interface Ctx { botToken: string; chatId: number; }

export async function handleAdminCommand(text: string, ctx: Ctx): Promise<boolean> {
  const t = text.trim();
  const [cmd, ...rest] = t.split(/\s+/);

  switch (cmd.toLowerCase()) {
    case "/sales":
    case "/продажи":
      await cmdSales(ctx, rest[0]);
      return true;
    case "/edit":
    case "/ред":
      await cmdEdit(ctx, rest);
      return true;
    case "/draft":
    case "/drafts":
    case "/черновики":
      await cmdDrafts(ctx);
      return true;
    default:
      return false;
  }
}

/* ── /sales ─────────────────────────────────────────────────────────────── */
async function cmdSales(ctx: Ctx, _period?: string): Promise<void> {
  const t = await umsatzTrend().catch(() => null);
  if (!t) {
    await sendMessage(ctx.botToken, ctx.chatId, "Не удалось загрузить статистику.").catch(() => {});
    return;
  }
  const pct = (cur: number, prev: number) =>
    prev > 0 ? `${cur >= prev ? "↑" : "↓"} ${Math.abs(Math.round((cur - prev) / prev * 100))}%` : "—";

  const text =
    `📊 <b>Продажи</b>\n\n` +
    `Сегодня: <b>${formatPreis(t.heute_cents / 100)}</b> (${t.orders_heute} зак.) ${pct(t.heute_cents, t.gestern_cents)} vs вчера\n` +
    `Неделя: <b>${formatPreis(t.woche_cents / 100)}</b> ${pct(t.woche_cents, t.vorwoche_cents)} vs пред.\n` +
    `Месяц: <b>${formatPreis(t.monat_cents / 100)}</b> ${pct(t.monat_cents, t.vormonat_cents)} vs пред.`;

  await sendMessage(ctx.botToken, ctx.chatId, text, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "🛡 Открыть Admin", web_app: { url: `${getSiteUrl()}/tg/admin` } }]],
    },
  }).catch(err => console.error("[cmd-sales]", err));
}

/* ── /edit <code> price=N stock=N publish|hide ─────────────────────────────── */
async function cmdEdit(ctx: Ctx, args: string[]): Promise<void> {
  if (args.length < 2) {
    await sendMessage(ctx.botToken, ctx.chatId,
      `Формат: <code>/edit V-0001 price=15000 stock=2 publish</code>\n\n` +
      `Поля: price, stock, publish, hide`,
      { parse_mode: "HTML" },
    ).catch(() => {});
    return;
  }

  const code = args[0].toUpperCase();
  const sets: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;
  let publishHint = "";

  for (const tok of args.slice(1)) {
    const low = tok.toLowerCase();
    if (low === "publish") {
      sets.push(`aktiv = true`, `b2c_mode = 'visible'`, `veroeffentlicht_am = COALESCE(veroeffentlicht_am, now())`);
      publishHint = "опубликован";
      continue;
    }
    if (low === "hide") {
      sets.push(`aktiv = false`, `b2c_mode = 'hidden'`);
      publishHint = "скрыт";
      continue;
    }
    const m = tok.match(/^(price|stock|preis|lager)=(\d+)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const num = parseInt(m[2], 10);
    if (key === "price" || key === "preis") { sets.push(`preis = $${idx++}`); vals.push(num); }
    if (key === "stock" || key === "lager") { sets.push(`lagerbestand = $${idx++}`); vals.push(num); }
  }

  if (sets.length === 0) {
    await sendMessage(ctx.botToken, ctx.chatId, "Нечего менять. Поля: price=, stock=, publish, hide").catch(() => {});
    return;
  }

  vals.push(code);
  try {
    const r = await query<{ id: string; name: string; preis: number; lagerbestand: number; aktiv: boolean; slug: string }>(
      `UPDATE sebo.produkte SET ${sets.join(", ")}, aktualisiert_am = now()
       WHERE artikel_code = $${idx}
       RETURNING id, name, preis, lagerbestand, aktiv, slug`,
      vals,
    );
    const p = r.rows[0];
    if (!p) {
      await sendMessage(ctx.botToken, ctx.chatId, `Товар ${code} не найден.`).catch(() => {});
      return;
    }
    const link = `${getSiteUrl()}/admin/produkte/${p.id}/bearbeiten`;
    await sendMessage(ctx.botToken, ctx.chatId,
      `✓ <b>${escapeHtml(p.name)}</b> обновлён${publishHint ? ` · ${publishHint}` : ""}\n\n` +
      `Цена: <b>${formatPreis(p.preis)}</b>\n` +
      `Остаток: ${p.lagerbestand}\n` +
      `Статус: ${p.aktiv ? "🟢 активен" : "⚪ скрыт"}`,
      {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "✏️ Открыть на сайте", url: link }]] },
      },
    ).catch(() => {});
  } catch (err) {
    console.error("[cmd-edit]", err);
    await sendMessage(ctx.botToken, ctx.chatId, "Ошибка при обновлении.").catch(() => {});
  }
}

/* ── /draft — offene Entwürfe ──────────────────────────────────────────────── */
async function cmdDrafts(ctx: Ctx): Promise<void> {
  try {
    const r = await query<{ artikel_code: string | null; name: string; id: string; preis: number }>(
      `SELECT artikel_code, name, id, preis FROM sebo.produkte
       WHERE aktiv = false
       ORDER BY erstellt_am DESC LIMIT 10`,
    );
    if (r.rows.length === 0) {
      await sendMessage(ctx.botToken, ctx.chatId, "Нет открытых черновиков. ✓").catch(() => {});
      return;
    }
    const lines = r.rows.map(p =>
      `• <code>${p.artikel_code ?? "—"}</code> ${escapeHtml(p.name.slice(0, 40))}${Number(p.preis) <= 1 ? " · <i>без цены</i>" : ` · ${formatPreis(p.preis)}`}`
    );
    await sendMessage(ctx.botToken, ctx.chatId,
      `📝 <b>Черновики</b> (${r.rows.length})\n\n` + lines.join("\n") +
      `\n\nБыстрая публикация: <code>/edit V-0001 price=15000 publish</code>`,
      { parse_mode: "HTML" },
    ).catch(() => {});
  } catch (err) {
    console.error("[cmd-drafts]", err);
    await sendMessage(ctx.botToken, ctx.chatId, "Ошибка загрузки черновиков.").catch(() => {});
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, c => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
}
