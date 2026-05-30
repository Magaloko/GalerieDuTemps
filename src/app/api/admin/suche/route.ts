import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/config";
import { ordersListe } from "@/lib/db/orders";
import { customersListe } from "@/lib/db/customers";
import { leadsListe } from "@/lib/db/leads";
import { produkteListe } from "@/lib/db/produkte";
import { formatPreis } from "@/lib/utils/preis";
import { rateLimitPruefen, getClientIp, tooManyRequestsResponse } from "@/lib/utils/rate-limit";

export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * GET /api/admin/suche?q=…
 *
 * Unified Operator-Suche fürs ⌘K-Command-Menu. Sucht parallel über
 * Bestellungen, Kunden, Leads und Produkte (je max. 5 Treffer) und liefert
 * eine flache, gruppierte Trefferliste mit basis-unabhängigen href-Suffixen
 * (der Client setzt /app oder /admin davor).
 *
 * Admin-only (NextAuth-Session). Rate-Limit 60/min/IP.
 * ────────────────────────────────────────────────────────────────────────── */

export interface SucheTreffer {
  gruppe: "bestellungen" | "kunden" | "leads" | "produkte";
  id:     string;
  titel:  string;
  sub:    string;
  /** href OHNE Basis — Client prefixt /app bzw. /admin. */
  href:   string;
}

export async function GET(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Нет прав" }, { status: 403 });

  const ip = getClientIp(req);
  const rl = rateLimitPruefen(`admin-suche:${ip}`, 60, 60 * 1000);
  if (!rl.erlaubt) return tooManyRequestsResponse(rl);

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ treffer: [] });

  const [orders, customers, leads, produkte] = await Promise.all([
    ordersListe({ suche: q, limit: 5 }).catch(() => ({ items: [] })),
    customersListe({ suche: q, limit: 5 }).catch(() => ({ items: [] })),
    leadsListe({ suche: q, limit: 5 }).catch(() => ({ items: [] })),
    produkteListe({ suche: q, limit: 5 }).catch(() => ({ items: [] })),
  ]);

  const treffer: SucheTreffer[] = [];

  for (const o of orders.items) {
    treffer.push({
      gruppe: "bestellungen",
      id:     o.id,
      titel:  `GDT-${String(o.order_number).padStart(4, "0")}`,
      sub:    `${o.customer_name ?? o.customer_email ?? "Гость"} · ${formatPreis(o.total_cents / 100)}`,
      href:   `/bestellungen/${o.id}`,
    });
  }

  for (const c of customers.items) {
    const name = [c.vorname, c.nachname].filter(Boolean).join(" ").trim();
    treffer.push({
      gruppe: "kunden",
      id:     c.id,
      titel:  name || c.email || `KD-${String(c.customer_number).padStart(4, "0")}`,
      sub:    [c.email, c.company_name].filter(Boolean).join(" · ") || "—",
      href:   `/kunden/${c.id}`,
    });
  }

  for (const l of leads.items) {
    treffer.push({
      gruppe: "leads",
      id:     l.id,
      titel:  l.kontakt_name ?? l.kontakt_email ?? l.kontakt_handle ?? "Лид",
      sub:    l.betreff || String(l.quelle).replace("_", " "),
      href:   `/leads/${l.id}`,
    });
  }

  for (const p of produkte.items) {
    treffer.push({
      gruppe: "produkte",
      id:     p.id,
      titel:  p.name,
      sub:    [p.artikel_code, p.kategorie_name].filter(Boolean).join(" · ") || formatPreis(p.preis),
      href:   `/produkte/${p.id}`,
    });
  }

  return NextResponse.json({ treffer, query: q });
}
