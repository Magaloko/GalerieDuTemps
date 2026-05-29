import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { TelegramAuthGate } from "../../auth-gate";
import { AdminBack, AdminHeader, AdminEmpty, AdminNotAllowed } from "../_ui";
import { instagramPostsAlle, instagramKategorienAlle } from "@/lib/db/instagram-archive";
import { produkteListe } from "@/lib/db/produkte";
import { brandsAktiv } from "@/lib/db/brands";
import { InstagramCreate } from "./instagram-create";
import { InstagramList } from "./instagram-list";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Instagram · Mini-App", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/* /tg/admin/instagram — Archiv verwalten: Embeds einfügen, kategorisieren, verknüpfen. */
export default async function TgAdminInstagram() {
  const session = await getWebAppSession();
  if (!session || session.role !== "admin") {
    return <TelegramAuthGate><AdminNotAllowed /></TelegramAuthGate>;
  }

  const [posts, kategorien, produkteRes, brands] = await Promise.all([
    instagramPostsAlle().catch(() => []),
    instagramKategorienAlle().catch(() => []),
    produkteListe({ seite: 1, limit: 200, status: "aktiv" }).catch(() => ({ items: [] as Awaited<ReturnType<typeof produkteListe>>["items"] })),
    brandsAktiv().catch(() => []),
  ]);

  const katOptions   = kategorien.map(k => ({ value: String(k.id), label: k.name }));
  const prodOptions  = produkteRes.items.map(p => ({ value: p.id, label: p.name }));
  const brandOptions = brands.map(b => ({ value: b.id, label: b.name }));

  return (
    <TelegramAuthGate>
      <main className="p-4 pb-8">
        <AdminBack />
        <AdminHeader eyebrow="✦ Каталог" titel="Instagram архив" sub={`${posts.length} постов · ${kategorien.length} категорий`} />

        <InstagramCreate kategorien={katOptions} produkte={prodOptions} brands={brandOptions} />

        {posts.length === 0 ? (
          <AdminEmpty text="Архив пуст. Вставьте embed-код поста выше." />
        ) : (
          <>
            <p className="text-[10px] mb-2" style={{ fontStyle: "italic", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
              Перетащите ⠿ для изменения порядка
            </p>
            <InstagramList
              posts={posts.map(p => ({
                id: p.id, permalink: p.permalink, shortcode: p.shortcode, typ: p.typ,
                aktiv: p.aktiv, kategorie_id: p.kategorie_id, produkt_id: p.produkt_id,
                brand_id: p.brand_id ?? null, titel: p.titel,
                kanal_gepostet_am: p.kanal_gepostet_am ?? null,
              }))}
              kategorien={katOptions}
              produkte={prodOptions}
              brands={brandOptions}
            />
          </>
        )}
      </main>
    </TelegramAuthGate>
  );
}
