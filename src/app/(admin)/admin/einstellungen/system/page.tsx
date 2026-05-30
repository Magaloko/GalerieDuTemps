import { getModuleBase } from "@/lib/module-base-server";
import Link from "next/link";
import { Activity, Database, Mail, HardDrive, Globe, ChevronLeft } from "lucide-react";
import { query } from "@/lib/db";
import { redisPing } from "@/lib/redis";
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stat, readdir } from "node:fs/promises";
import { SystemHealthRefresh } from "./client";
import { MigrateImagesButton } from "./migrate-images-button";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Системное состояние" };
export const dynamic   = "force-dynamic";
export const revalidate = 0;

/* ──────────────────────────────────────────────────────────────────────────
 * Admin > Einstellungen > System
 *
 * Zentrale Übersicht über alle Infrastruktur-Komponenten:
 *   - Site-URL (NEXT_PUBLIC_SITE_URL / NEXTAUTH_URL)
 *   - Postgres-Datenbank + Migration-Count
 *   - Redis-Cache (Upstash oder lokal)
 *   - E-Mail-Provider (Resend oder Brevo)
 *   - Upload-Volume (Persistent Disk?)
 *
 * Jedes Modul: Status-Badge (✓ OK / ⚠ Warning / ✗ Down) + Detail-Info +
 * Quick-Fix-Hinweis. Verlinkt auf die JSON-Health-Endpoints für Raw-Daten.
 * ────────────────────────────────────────────────────────────────────────── */

type Status = "ok" | "warn" | "down";

interface Check {
  status:  Status;
  title:   string;
  details: { label: string; value: string; sub?: string }[];
  hinweis?: string;
  jsonUrl?: string;
}

async function checkSiteUrl(): Promise<Check> {
  const pub  = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const auth = process.env.NEXTAUTH_URL?.trim();
  const url  = pub || auth;

  const status: Status = !url ? "down" : "ok";
  return {
    status,
    title: "Site-URL",
    details: [
      { label: "NEXT_PUBLIC_SITE_URL", value: pub  || "(не задано)" },
      { label: "NEXTAUTH_URL",          value: auth || "(не задано)" },
      { label: "Активный URL",          value: url  || "FALLBACK на localhost!" },
    ],
    hinweis: !url
      ? "В Coolify задать NEXT_PUBLIC_SITE_URL=https://galerie.apps.dadakaev.tech и Redeploy. Иначе все e-mail-ссылки указывают на localhost."
      : undefined,
  };
}

async function checkDatabase(): Promise<Check> {
  try {
    const r = await query<{ count: number; latest: string }>(
      `SELECT COUNT(*)::int AS count, MAX(filename) AS latest FROM sebo.schema_migrations`,
    );
    const sqlDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..", "..", "sql");
    let fileCount = 0;
    try {
      fileCount = readdirSync(sqlDir).filter(f => f.endsWith(".sql") && !f.startsWith("_")).length;
    } catch { /* ignore */ }

    const inSync = fileCount > 0 && r.rows[0].count === fileCount;
    return {
      status:  inSync ? "ok" : "warn",
      title:   "Postgres",
      details: [
        { label: "Подключение",        value: "✓ работает" },
        { label: "Миграций в DB",      value: String(r.rows[0].count) },
        { label: "Файлов миграций",    value: String(fileCount) },
        { label: "Последняя",          value: r.rows[0].latest ?? "(нет)" },
      ],
      hinweis: !inSync
        ? "Количество миграций в БД отличается от файлов. Выполни npm run db:migrate."
        : undefined,
      jsonUrl: "/api/health",
    };
  } catch (err) {
    return {
      status: "down",
      title: "Postgres",
      details: [
        { label: "Подключение", value: "✗ не работает" },
        { label: "Ошибка",      value: err instanceof Error ? err.message.slice(0, 100) : String(err) },
      ],
      hinweis: "Проверь DATABASE_URL в Coolify. Pool создаётся лениво при первом запросе.",
    };
  }
}

async function checkRedis(): Promise<Check> {
  const configured = Boolean(process.env.REDIS_URL);
  if (!configured) {
    return {
      status:  "warn",
      title:   "Redis (Cache + Rate-Limit)",
      details: [
        { label: "REDIS_URL",   value: "(не задано — fallback на in-memory)" },
        { label: "Кеш",         value: "off" },
        { label: "Rate-Limit",  value: "in-memory per-instance" },
        { label: "Sessions",    value: "off" },
      ],
      hinweis: "Опционально. Без Redis работает, но при нескольких репликах rate-limit делится. Получи URL на console.upstash.com.",
    };
  }
  try {
    const ok = await redisPing();
    return {
      status:  ok ? "ok" : "down",
      title:   "Redis (Cache + Rate-Limit)",
      details: [
        { label: "REDIS_URL", value: "✓ задано" },
        { label: "PING",      value: ok ? "✓ pong" : "✗ нет ответа" },
        { label: "TLS",       value: process.env.REDIS_URL!.startsWith("rediss://") ? "✓ rediss://" : "○ plain" },
      ],
      hinweis: !ok ? "REDIS_URL задан, но PING не отвечает — проверь токен и Endpoint." : undefined,
      jsonUrl: "/api/health/infra",
    };
  } catch (err) {
    return {
      status: "down",
      title: "Redis (Cache + Rate-Limit)",
      details: [
        { label: "Ошибка", value: err instanceof Error ? err.message.slice(0, 100) : String(err) },
      ],
      hinweis: "Проверь правильность REDIS_URL (rediss:// для Upstash, redis:// для локального).",
    };
  }
}

async function checkEmail(): Promise<Check> {
  const provider  = (process.env.EMAIL_PROVIDER ?? "brevo").toLowerCase();
  const emailFrom = process.env.EMAIL_FROM;
  const problems: string[] = [];

  let keyOk = false;
  let keyPreview = "(не задано)";
  if (provider === "resend") {
    const k = process.env.RESEND_API_KEY;
    keyOk = Boolean(k && k.startsWith("re_"));
    keyPreview = k ? `${k.slice(0, 8)}…` : "(не задано)";
    if (!k)                 problems.push("RESEND_API_KEY не задан");
    else if (!k.startsWith("re_")) problems.push("RESEND_API_KEY некорректен");
    if (!emailFrom)          problems.push("EMAIL_FROM не задан");
  } else {
    const k = process.env.BREVO_API_KEY;
    keyOk = Boolean(k);
    keyPreview = k ? `${k.slice(0, 8)}…` : "(не задано)";
    if (!k) problems.push("BREVO_API_KEY не задан");
  }

  const status: Status = problems.length === 0 && keyOk ? "ok" : "down";
  return {
    status,
    title: "E-Mail-Provider",
    details: [
      { label: "EMAIL_PROVIDER",                        value: provider },
      { label: `${provider.toUpperCase()}_API_KEY`,     value: keyPreview, sub: keyOk ? "✓ формат OK" : "" },
      { label: "EMAIL_FROM",                            value: emailFrom ?? "(default)" },
      { label: "EMAIL_FROM_NAME",                       value: process.env.EMAIL_FROM_NAME ?? "(default)" },
    ],
    hinweis: problems.length > 0
      ? `Не настроено: ${problems.join("; ")}. Установи в Coolify ENV и redeploy.`
      : undefined,
    jsonUrl: "/api/health/email",
  };
}

async function checkUploads(): Promise<Check> {
  const dir = process.env.UPLOAD_DIR ?? "/app/public/uploads";
  try {
    const info = await stat(dir);
    if (!info.isDirectory()) {
      return {
        status: "down",
        title:  "Uploads (Persistent Volume)",
        details: [
          { label: "UPLOAD_DIR", value: dir },
          { label: "Тип",        value: "✗ не директория!" },
        ],
        hinweis: "Путь существует, но не директория. Проверь Coolify-Volume-Mount.",
      };
    }
    const entries = await readdir(dir);
    return {
      status:  "ok",
      title:   "Uploads (Persistent Volume)",
      details: [
        { label: "UPLOAD_DIR",      value: dir,                              sub: process.env.UPLOAD_DIR ? "✓ из ENV" : "default" },
        { label: "Файлов",          value: String(entries.length) },
        { label: "Доступ",          value: "✓ readable" },
      ],
      hinweis: entries.length === 0 ? "Папка пустая — это нормально для свежего деплоя." : undefined,
      jsonUrl: "/api/health/uploads",
    };
  } catch (err) {
    return {
      status: "down",
      title:  "Uploads (Persistent Volume)",
      details: [
        { label: "UPLOAD_DIR", value: dir },
        { label: "Ошибка",     value: err instanceof Error ? err.message.slice(0, 100) : String(err) },
      ],
      hinweis: "В Coolify: Storage → Add Persistent Volume → Source: vintage-uploads → Destination: /app/public/uploads. Затем Redeploy.",
    };
  }
}

export default async function SystemPage() {
  const base = await getModuleBase();
  const [siteCheck, dbCheck, redisCheck, emailCheck, uploadsCheck] = await Promise.all([
    checkSiteUrl(),
    checkDatabase(),
    checkRedis(),
    checkEmail(),
    checkUploads(),
  ]);

  const allChecks = [
    { check: siteCheck,    icon: Globe },
    { check: dbCheck,      icon: Database },
    { check: redisCheck,   icon: Activity },
    { check: emailCheck,   icon: Mail },
    { check: uploadsCheck, icon: HardDrive },
  ];

  const overallOk    = allChecks.every(c => c.check.status === "ok");
  const downCount    = allChecks.filter(c => c.check.status === "down").length;
  const warnCount    = allChecks.filter(c => c.check.status === "warn").length;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={`${base}/einstellungen`}
            className="p-1.5 hover:bg-vintage-sand/40 transition-colors"
            style={{ borderRadius: "var(--radius-vintage)" }}
            aria-label="Назад"
          >
            <ChevronLeft className="w-4 h-4 text-vintage-dust" />
          </Link>
          <Activity className="w-5 h-5 text-vintage-gold" />
          <div>
            <p className="text-vintage-gold text-xs tracking-widest">✦</p>
            <h1 className="font-serif text-2xl text-vintage-espresso">Системное состояние</h1>
            <p className="text-vintage-dust text-xs font-sans mt-0.5">
              Инфраструктура: БД · Redis · E-Mail · Uploads · Domain
            </p>
          </div>
        </div>
        <SystemHealthRefresh />
      </div>

      {/* Gesamt-Status */}
      <div
        className="p-5"
        style={{
          background:
            overallOk      ? "rgba(127,140,90,0.08)" :
            downCount > 0  ? "rgba(232,112,58,0.08)" :
                             "rgba(201,168,76,0.10)",
          border: `1px solid ${
            overallOk      ? "rgba(127,140,90,0.30)" :
            downCount > 0  ? "rgba(232,112,58,0.40)" :
                             "rgba(201,168,76,0.40)"
          }`,
          borderLeft: `4px solid ${
            overallOk      ? "var(--color-sage, #7F8C5A)" :
            downCount > 0  ? "var(--color-coral)" :
                             "var(--color-gold, #C9A84C)"
          }`,
          borderRadius: "var(--radius-card)",
        }}
      >
        <p className="font-serif text-base text-vintage-espresso">
          {overallOk
            ? "✓ Все системы работают"
            : downCount > 0
              ? `✗ ${downCount} компонент(ов) не работают`
              : `⚠ ${warnCount} предупреждени(й)`}
        </p>
        <p className="text-xs text-vintage-dust mt-1 font-sans">
          Проверено сейчас. Перезагрузите страницу для свежих данных.
        </p>
      </div>

      {/* Checks */}
      <div className="space-y-4">
        {allChecks.map(({ check, icon: Icon }) => (
          <SystemCheckCard key={check.title} check={check} Icon={Icon} />
        ))}
      </div>

      {/* Bild-Migration (lokale Uploads → Supabase) */}
      <MigrateImagesButton />

      {/* CLI-Tools */}
      <div
        className="p-5 space-y-2"
        style={{
          background:   "#fff",
          border:       "1px solid var(--color-line)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <h3 className="font-serif text-sm text-vintage-espresso">CLI-инструменты</h3>
        <ul className="text-xs text-vintage-dust font-mono space-y-1 list-disc pl-5">
          <li><code>npm run db:check</code> — полная диагностика БД (orphans, drift, statistics)</li>
          <li><code>npm run db:migrate</code> — выполнить ожидающие миграции</li>
          <li><code>curl /api/health/infra</code> — JSON-отчёт</li>
        </ul>
      </div>
    </div>
  );
}

function SystemCheckCard({ check, Icon }: { check: Check; Icon: React.ElementType }) {
  const statusStyle = {
    ok:   { bg: "rgba(127,140,90,0.08)", border: "rgba(127,140,90,0.30)", text: "#52663F", label: "✓ OK" },
    warn: { bg: "rgba(201,168,76,0.10)", border: "rgba(201,168,76,0.40)", text: "#8B6F47", label: "⚠ Внимание" },
    down: { bg: "rgba(232,112,58,0.08)", border: "rgba(232,112,58,0.45)", text: "#A53E26", label: "✗ Down" },
  }[check.status];

  return (
    <div
      style={{
        background:   "#fff",
        border:       "1px solid var(--color-line)",
        borderLeft:   `4px solid ${statusStyle.border}`,
        borderRadius: "var(--radius-card)",
      }}
      className="p-5"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-vintage-gold" />
          <h2 className="font-serif text-base text-vintage-espresso">{check.title}</h2>
        </div>
        <span
          className="px-2 py-0.5 text-[11px] font-sans uppercase tracking-widest"
          style={{
            background:   statusStyle.bg,
            color:        statusStyle.text,
            border:       `1px solid ${statusStyle.border}`,
            borderRadius: "var(--radius-vintage)",
          }}
        >
          {statusStyle.label}
        </span>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-x-4 gap-y-1.5 text-xs">
        {check.details.map((d, i) => (
          <div key={i} className="contents">
            <dt className="text-vintage-dust font-sans">{d.label}</dt>
            <dd
              className="text-vintage-ink"
              style={{ fontFamily: d.value.length > 30 || d.label.includes("URL") ? "var(--font-mono)" : "var(--font-body)" }}
            >
              {d.value}
              {d.sub && <span className="ml-2 text-vintage-dust">{d.sub}</span>}
            </dd>
          </div>
        ))}
      </dl>

      {(check.hinweis || check.jsonUrl) && (
        <div className="mt-3 pt-3 border-t border-vintage-sand/50 text-[12px] text-vintage-dust font-sans flex flex-wrap items-center gap-3">
          {check.hinweis && <p className="flex-1 min-w-0">{check.hinweis}</p>}
          {check.jsonUrl && (
            <a
              href={check.jsonUrl}
              target="_blank"
              rel="noopener"
              className="shrink-0 underline hover:text-vintage-coral"
            >
              Raw JSON ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}
